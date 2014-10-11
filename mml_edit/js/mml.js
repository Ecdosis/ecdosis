/**
 * Remember where we are in a list of pages
 * @param ref the value of the milestone, e.g. "4" for page 4
 * @param loc the location in pixels or whatever units where the ms starts
 */
function RefLoc( ref, loc) {
    this.ref = ref;
    this.loc = loc;
}
/**
 * An MML Editor provides 3 panels which are sync-scrolled.
 * In the first panel there is a succession of page-images.
 * In the second an editable text in a minimal markup language (MML).
 * In the third a HTML preview generated from the editable text.
 * @param target the id of the element to append the editor to
 * @param docid the docid of the document to edit
 * @param version1 the version to display
 * @param modpath the path to the module from web_root
 */
function MMLEditor(target, docid, version1, modpath ) {
    this.target = target;
    /** set to true when source altered, controls updating */
    this.changed = true;
    /** set to false whenever use edits and does not save*/
    this.saved = true;
    /** quote chars for smartquotes */
    this.quotes = {"'":1,"‘":1,"’":1,'"':1,'”':1,'“':1};
    /** number of lines in textarea source */
    this.num_lines = 0;
    /** flag to indicate if current para was formatted */
    this.formatted = false;
    /** flag to indicate when images have been loaded */
    this.imagesLoaded = false;
    /** flag for info displayed */
    this.infoDisplayed = false;
    /** page break RefLoc page starts in textarea (lines) */
    this.text_lines = new Array();
    /** page break RefLocs for html target */
    this.html_lines = new Array();
    /** page-breaks for images */
    this.image_lines = new Array();
    /** dialect file of MML */
    this.dialect = undefined;
    /** docid of the current document */
    this.docid = docid;
    /** human readable name of the author */
    this.author = undefined;
    /** the human readable title of the work */
    this.title = undefined;
    /** the first version in the document to display */
    this.version1 = version1;
    /** The section name */
    this.section = undefined;
    /** the web-path to the module */
    this.modpath = modpath;
    /** specify supported languges */
    this.languages = {italiano:'it',italian:'it',espagñol:'es',spanish:'es',english:'en'};
    /** refer to ourself in dependent functions */
    var self = this;
    /**
     * Get a shortened version of the docid 
     * @return the server's corform ID for this document
     */
    this.styleID = function() {
        var parts = docid.split("/");
        if ( parts.length>= 2 )
        {
            var sb = "";
            sb += parts[0];
            sb += "/";
            sb += parts[1];
            return sb;
        }
        else
            return this.docid;
    };
    /**
     * This should be a function of Array
     * @param the Array to test
     * @return the last element of Array, which is NOT modified
     */
    this.peek = function( stack )
    {
        return (stack.length==0)?undefined:stack[stack.length-1];
    };
    /**
     * Make a generic divider. It is a table with four cells.
     * @param prop the class name of the table and cell properties
     * @return the HTML table with class names suitable for CSS
     */
    this.makeDivider = function( prop )
    {
        var sb = "";
        sb += '<table class="';
        sb += prop;
        sb += '" title="';
        sb += prop;
        sb += '"><tr><td class="';
        sb += prop;
        sb += '-lefttop">';
        sb += "</td>";
        sb += '<td class="';
        sb += prop;
        sb += '-righttop">';
        sb += "</td></tr>";
        sb += '<tr><td class="';
        sb += prop;
        sb += '-leftbot">';
        sb += "</td>";
        sb += '<td class="';
        sb += prop;
        sb += '-rightbot">';
        sb += "</td></tr>";
        sb += "</table>";
        return sb;
    };
    /**
     * Process a paragraph for possible dividers
     * @param text the text to process
     * @return the possibly modified text
     */
    this.processDividers = function(text)
    {
        if ( this.dialect.dividers!=undefined )
        {
            var divs = this.dialect.dividers;
            for ( var i=0;i<divs.length;i++ )
            {
                var div = divs[i];
                if ( text.trim() == div.tag )
                {
                    text = this.makeDivider( div.prop );
                    this.formatted = true;
                }
            }
        }
        return text;
    };
    /**
     * Get a curly close quote character 
     * @param quote the quote to convert
     * @return the Unicode curly variant
    */
    this.closeQuote = function( quote )
    {
        if ( quote=="'" )
            return "’";
        else if ( quote == '"' )
            return '”';
        else
            return quote;
    };
    /**
     * Get a curly opening quote character 
     * @param quote the quote to convert
     * @return the Unicode curly variant
    */
    this.openQuote = function( quote )
    {
        if ( quote=="'" )
            return "‘";
        else if ( quote == '"' )
            return '“';
        else
            return quote;
    };
    /**
     * Is this a curly or straight quote char?
     * @param c the quote to test
     * @return true if it is
     */
    this.isQuote= function( c )
    {
        return c in this.quotes;
    };
    /**
     * Is this a plain space char?
     * @param c the char to test
     * @return true if it is
     */
    this.isSpace = function( c )
    {
        return c == '\t'||c==' ';
    };
    /**
     * Is this an opening bracket of some kind?
     * @param c the char to test
     * @return true if it is
     */
    this.isOpeningBracket = function(c)
    {
        return c=='['||c=='('||c=='{'||c=='<';
    };
    /**
     * Specifically test for an opening quote char
     * @param c the char to test
     * @return true if it is
     */
    this.isOpeningQuote = function(c)
    {
        return c=="‘"||c=='“';
    };
    /**
     * Convert smart quotes as fast as possible. Do this first.
     * @param text the text of a paragraph
     * @return the modified text
     */
    this.processSmartQuotes = function( text )
    {
        if ( this.dialect.smartquotes )
        {
            for ( var i=0;i<text.length;i++ )
            {
                var c = text[i];
                if ( this.isQuote(c) )
                {
                    var prev = text[i-1];
                    if ( i==0||(this.isSpace(prev)
                        ||this.isOpeningQuote(prev)||this.isOpeningBracket(prev)) )
                        text = text.slice(0,i)+this.openQuote(c)+text.slice(i+1);
                    else
                        text = text.slice(0,i)+this.closeQuote(c)+text.slice(i+1);
                }
            }
        }
        return text;         
    };
    /**
     * Search for and replace all character formats in the paragraph
     * @param text the text of the paragraph
     * @return the possibly modified text with spans inserted
     */ 
    this.processCfmts = function(text)
    {
        if ( this.dialect.charformats != undefined )
        {
            var cfmts = this.dialect.charformats;
            var tags = new Array();
            var stack = new Array();
            for ( var k=0;k<cfmts.length;k++ )
            {
                var cfmt = cfmts[k];
                if ( cfmt.tag != undefined )
                    tags[cfmt.tag] = (cfmt.prop!=undefined)?cfmt.prop:cfmt.tag;
            }
            // add default soft-hyphens
            tags["-\n"] = "soft-hyphen";
            var i = 0;
            while ( i<text.length )
            {
                var c = text[i];
                for ( var tag in tags )
                {
                    var j;
                    for ( j=0;j<tag.length;j++ )
                    {
                        if ( text[i+j]!=tag[j] )
                            break;
                    }
                    if ( j == tag.length )
                    {
                        if ( this.dialect.softhyphens != undefined 
                            && this.dialect.softhyphens && tag == "-\n" )
                        {
                            text = text.slice(0,i)
                                +'<span class="soft-hyphen">-</span>'
                                +text.slice(i+2);
                            i += 34;
                        }
                        else if ( stack.length>0&&this.peek(stack)==tag )
                        {
                            stack.pop();
                            text = text.slice(0,i)+"</span>"
                                +text.slice(i+tag.length);
                            i += 6 -tag.length;
                        }
                        else
                        {
                            stack.push(tag);
                            text = text.slice(0,i)+'<span class="'
                                +tags[tag]+'" title="'+tags[tag]+'">'
                            +text.slice(i+tag.length);
                            i += 14+(tags[tag].length-tag.length);
                        }
                    }
                }
                i++; 
            }
        }
        // else do nothing
        return text;
    };
    /**
     * Find start of tag after leading white space
     * @param text the text to search
     * @param tag the tag to find at the end
     * @return -1 on failure else index of tag-start at end of text
     */
    this.startPos = function( text, tag )
    {
        var i = 0;
        while ( i<text.length&&(text.charAt(i)=='\t'||text.charAt(i)==' ') )
            i++;
        if ( text.indexOf(tag)==i )
            return i;
        else
            return -1;
    };
    /**
     * Find the last instance of tag before trailing white space
     * @param text the text to search
     * @param tag the tag to find at the end
     * @return -1 on failure else index of tag-start at end of text
     */
    this.endPos = function( text, tag )
    {
        var i = text.length-1;
        while ( i>=0 )
        {
            if ( text[i]==' '||text[i]=='\n'||text[i]=='\t' )
                i--;
            else
                break;
        }
        var j = tag.length-1;
        while ( j >= 0 )
        {
            if ( tag[j] != text[i] )
                break;
            else
            {
                j--;
                i--;
            }
        }
        return (j==-1)?i+1:-1;
    };
    /**
     * Scan the start and end of the paragraph for defined para formats.
     * @param text the text to of the paragraph 
     * @return the possibly modified text with p-formats inserted
     */
    this.processPfmts = function( text )
    {
        if ( this.dialect.paraformats !=undefined )
        {
            var pfmts = this.dialect.paraformats;
            for ( var i=0;i<pfmts.length;i++ )
            {
                var pfmt = pfmts[i];
                if ( pfmt.leftTag != undefined && pfmt.rightTag != undefined )
                {
                    var ltag = pfmt.leftTag;
                    var rtag = pfmt.rightTag;
                    var lpos = this.startPos(text,ltag);
                    var rpos = this.endPos(text,rtag);
                    if (  lpos != -1 && rpos != -1 )
                    {
                        text = '<p class="'+pfmt.prop+'"'
                            +' title="'+pfmt.prop+'">'
                            +text.slice(lpos+ltag.length,rpos)+'</p>';
                        this.formatted = true;
                        break;
                    }
                }
            }
        }
        return text;
    };
    /**
     * Get the indent level of this line
     * @param line the line with some leading spaces
     * @return the level (4 spaces or a tab == 1 level)
     */
    this.getLevel = function( line )
    {
        var level = 0;
        var spaces = 0;
        var j;
        for ( j=0;j<line.length;j++ )
        {
            var token = line.charAt(j);
            if ( token =='\t' )
                level++;
            else if ( token==' ' )
            {
                spaces++;
                if ( spaces >= 4 )
                {
                    level++;
                    spaces = 0;
                }
            }
            else
                break;
        }
        // completely blank lines are NOT indented
        return (j==line.length)?0:level;
    };
    /**
     * Start a new level of preformatting
     * @param level the depth of the level (greater than 0)
     */
    this.startPre = function( level )
    {
        var text = "<pre";
        var prop = this.dialect.codeblocks[level-1].prop;
        if ( prop != undefined && prop.length > 0 )
            text += ' class="'+prop+'">';
        else
            text += '>';
        this.formatted = true;
        return text;
    };
    /**
     * Remove leading white space. If no such whitespace do nothing.
     * @param line the line to remove it from
     * @param level the level of the preformatting
     * @return the modified line
     */
    this.leadTrim = function(line,level)
    {
        for ( var i=0;i<level;i++ )
        {
            if ( line.indexOf("    ")==0 )
                line = line.substring(4);
            else if ( line.indexOf("\t")==0)
                line = line.substring(1);
        }
        return line;
    };
    /**
     * Look for four leading white spaces and format as pre
     * @param text the text of the paragraph
     */
    this.processCodeBlocks = function( input )
    {
        var text = "";
        if ( this.dialect.codeblocks!=undefined )
        {
            var lines = input.split("\n");
            var level = 0;
            var mss = (this.dialect.milestones!=undefined
                &&this.dialect.milestones.length>0)
                ?this.dialect.milestones:undefined;
            for ( var i=0;i<lines.length;i++ )
            {
                var currLevel = this.getLevel(lines[i]);
                if ( mss == undefined || this.isMilestone(lines[i],mss)==undefined )
                {
                    if ( currLevel > level )
                    {
                        if ( level > 0 )
                            text += '</pre>';
                        if ( currLevel <= this.dialect.codeblocks.length )
                            text += this.startPre(currLevel);
                        else // stay at current level
                            currLevel = level;
                    }
                    else if ( currLevel < level )
                    {
                        text += '</pre>';
                        if ( currLevel > 0 )
                            text += this.startPre(currLevel);
                    }
                    level = currLevel;
                }
                text += (lines[i].length>0)?this.leadTrim(lines[i],currLevel):"";
                if ( i < lines.length-1 )
                    text += '\n';
            }
            if ( level > 0 )
                text += "</pre><p></p>";
        }
        else
            text = input;
        return text;
    };
    /**
     * Get the quote depth of the current line
     * @paramline the line to test for leading >s
     * @return the number of leading >s followed by spaces
     */
    this.quoteDepth = function( line )
    {
        var state = 0;
        var depth = 0;
        for ( var i=0;i<line.length;i++ )
        {
            var c = line.charAt(i);
            switch ( state )
            {
                case 0: // looking for ">"
                    if ( c=='>' )
                    {
                        depth++;
                        state = 1;
                    }
                    else if ( c!=' '&&c!='\t' )
                        state = -1;
                    break;
                case 1: // looking for obligatory space
                    if ( c==' '||c=='\t' )
                        state = 0;
                    else
                        state = -1;
                    break;
        
            }
            if ( state == -1 )
                break;
        }
        return depth;
    };
    /**
     * Strip the leading quotations from a line
     * @param line
     * @return the line with leading quotations (>s) removed
     */
    this.stripQuotations = function( line )
    {
        var i = 0;
        var c = (line.length>0)?line.charAt(0):undefined;
        if ( this.startPos(line,">")==0 )
        {
            while ( i<line.length && (c=='>'||c=='\t'||c==' ') )
            {
                i++;
                if ( i < line.length )
                    c = line.charAt(i);
            }
        }
        return line.slice(i);
    };
    /**
     * Quotations are lines starting with "> "
     * @param text the text to scan for quotations and convert
     * @return the possibly formatted paragraph
     */
    this.processQuotations = function(text)
    {
        if ( this.dialect.quotations != undefined )
        {
            var old;
            var res = "";
            var attr = (this.dialect.quotations.prop!=undefined
                &&this.dialect.quotations.prop.length>0)
                ?' class="'+this.dialect.quotations.prop+'"':"";
            var stack = new Array();
            var lines = text.split("\n");
            for ( var i=0;i<lines.length;i++ )
            {
                var depth = this.quoteDepth(lines[i]);
                if ( depth > 0 )
                {
                    if ( this.peek(stack) != depth )
                    {
                        if ( stack.length==0||this.peek(stack)<depth )
                        {
                            for ( var j=stack.length;j<depth;j++ )
                                res += "<blockquote"+attr+'>';
                            stack.push(depth);
                        }
                        else if ( depth < this.peek(stack) )
                        {
                            old = stack.pop();
                            while ( old != undefined && old>depth )
                            {
                                res +="</blockquote>";
                                depth = old;
                            }
                        }
                    }
                }
                res += this.stripQuotations(lines[i])+"\n";
            }
            old = this.peek(stack);
            while ( old != undefined && old > 0 )
            {
                old = stack.pop();
                if ( old != undefined )
                    res +="</blockquote>";
            }
            text = res;
            if ( this.startPos(text,"<blockquote")==0 
                && this.endPos(text,"</blockquote>")==text.length-13 )
                this.formatted = true;
        }
        return text;
    };
    /**
     * Does the given line define a heading for the line above?
     * @param line the line to test - should be all the same character
     * @param c the character that should be uniform
     * @return true if it qualifies
     */
    this.isHeading = function( line, c )
    {
        var j = 0;
        for ( ;j<line.length;j++ )
        {
            if ( line.charAt(j) !=c )
                break;  
        }
        return j == line.length;
    };
    /**
     * Is the current line a milestone?
     * @para, line the line to test
     * @param mss an array of milestone defs
     * @return the relevant milestone
     */
    this.isMilestone = function( line, mss )
    {
        var line2 = line.trim();
        for ( var i=0;i<mss.length;i++ )
        {
            var ms = mss[i];
            if ( this.startPos(line2,ms.leftTag)==0 
                && this.endPos(line2,ms.rightTag)==line2.length-ms.rightTag.length )
                return ms;
        }
        return undefined;
    };
    /**
     * Process setext type headings (we don't do atx). Oh, and do milestones.
     * @param text the text to give headings to
     * @return the possibly modified text
     */
    this.processHeadings = function( text )
    {
        if ( this.dialect.headings !=undefined )
        {
            var i;
            var res = "";
            var mss = (this.dialect.milestones!=undefined&&this.dialect.milestones.length>0)
                ?this.dialect.milestones:undefined;
            var heads = new Array();
            var tags = new Array();
            for ( i=0;i<this.dialect.headings.length;i++ )
            {
                if ( this.dialect.headings[i].prop != undefined 
                    && this.dialect.headings[i].tag != undefined )
                {
                    heads[this.dialect.headings[i].tag] = this.dialect.headings[i].prop;    
                    tags[this.dialect.headings[i].prop] = 'h'+(i+1);
                }
            }
            var lines = text.split("\n");
            for ( i=0;i<lines.length;i++ )
            {
                var ms;
                var line = lines[i];
                this.num_lines++;
                if ( line.length > 0 )
                {
                    var c = line.charAt(0);
                    if ( c in heads && i>0 && this.isHeading(lines[i],c) )
                    {
                        var attr = ' class="'+heads[c]+'" title="'+heads[c]+'"';
                        res += '<'+tags[heads[c]]+attr+'>'+lines[i-1]
                            +'</'+tags[heads[c]]+'>\n';  
                        this.formatted = true; 
                    }
                    else if ( mss != undefined 
                        && (ms=this.isMilestone(line,mss))!=undefined )
                    {
                        var ref = line.slice(ms.leftTag.length,
                            this.endPos(line,ms.rightTag));
                        if ( ms.prop=="page" )
                        {
                            //console.log("ref="+ref+" num_lines="+this.num_lines);
                            this.text_lines.push(new RefLoc(ref,this.num_lines));
                        }
                        res += '<span class="'+ms.prop+'">'
                            +ref+'</span>';
                    }
                    else if ( i == lines.length-1 )
                         res += line+'\n';
                    else
                    {
                        var next = lines[i+1];
                        var d = next.charAt(0);
                        if ( !(d in heads && this.isHeading(next,d)) )
                            res += line+'\n';
                    }
                }
            }
            text = res;
        }
        return text;
    };
    /**
     * Process an entire paragraph
     * @param text the text to process
     * @return the possibly modified text with HTML codes inserted
     */
    this.processPara = function( text )
    {
        this.formatted = false;
        var attr = (this.dialect.paragraph!=undefined
            &&this.dialect.paragraph.prop!=undefined
            &&this.dialect.paragraph.prop.length>0)
            ?' class="'+this.dialect.paragraph.prop+'" title="'
            +this.dialect.paragraph.prop+'"':"";
        text = this.processSmartQuotes(text);
        text = this.processCodeBlocks(text);
        text = this.processHeadings(text);
        text = this.processQuotations(text);
        text = this.processPfmts(text);
        text = this.processDividers(text);
        text = this.processCfmts(text);
        if ( !this.formatted && text.length > 0 )
            text = '<p'+attr+'>'+text+'</p>';
        //console.log("num_lines="+this.num_lines);
        return text;
    };
    /**
     * Process all the paras in a section
     * @param section the text of the section
     * @return the modified content of the section
     */
    this.processSection = function( section )
    {
        var html = "";
        var paras = section.split("\n\n");
        for ( var i=0;i<paras.length;i++ )
        {
            if ( paras[i].length > 0 )
                html += this.processPara(paras[i]);
            this.num_lines++;
        }
        return html;
    };
    this.isEmptySection = function(section) {
        var empty = true;
        for ( var i=0;i<section.length;i++ )
        {
            var c = section.charAt(i);
            if ( c!='\t'||c!=' '||c!= '\n' )
                return false;
        }
        return true;
    };
    /**
     * Convert the MML text into HTML
     * @param text the text to convert
     * @return HTML
     */
    this.toHTML = function(text)
    {
        var html = "";
        this.num_lines = 0;
        var sectionName = (this.dialect.section!=undefined
            &&this.dialect.section.prop!=undefined)
            ?this.dialect.section.prop:"section";
        var sections = text.split("\n\n\n");
        if ( this.isEmptySection(sections[sections.length-1]) )
            sections = sections.slice(0,sections.length-1);
        for ( var i=0;i<sections.length;i++ )
        {
            html+= '<div class="'+sectionName+'">'
                +this.processSection(sections[i]);
            html += '</div>';
            this.num_lines ++;
        }
        //console.log("num_lines="+this.num_lines);
        return html;
    };
    /**
     * Check if we need to update the HTML. Gets called repeatedly.
     */
    this.updateHTML = function()
    {
        if ( this.changed )
        {
            this.text_lines = new Array();
            this.html_lines = new Array();
            var text = jQuery("#source").val();
            jQuery("#target").html(this.toHTML(text));
            this.changed = false;
            jQuery(".page").css("display","inline");
            var base = 0;
            var self = this;
            jQuery(".page").each( function(i) {
                var pos = jQuery(this).offset().top;
                if ( base==0 && pos < 0 )
                {
                    //console.log("setting base to be "+base);
                    base = Math.abs(pos);
                }
                self.html_lines.push(new RefLoc(jQuery(this).text(),pos+base));
                // inefficient but the only way
                jQuery(this).css("display","none");
            });
            this.recomputeImageHeights();
        }
    };
    /**
     * Find the index of the highest value in the refarray 
     * less than or equal to the given value
     * @param list a sorted array of RefLocs
     * @param value the value of loc to search for
     * @return -1 if no element is less than or equal to, or the index  
     * of the highest element in refarray that is
     */
    this.findHighestIndex = function( list, value )
    {
        var top = 0;
        var bot = list.length-1;
        var mid=0;
        while ( top <= bot )
        {
            mid = Math.floor((top+bot)/2);
            if ( value < list[mid].loc )
            {
                if ( mid == 0 )
                    // value < than first item
                    return -1;  
                else
                    bot = mid-1;
            }
            else    // value >= list[mid].loc
            {
                if ( mid == list.length-1 )
                    // value is >= last item
                    break;
                else if ( value >= list[mid+1].loc )
                    top = mid+1;
                else // list[mid] must be biggest <= value
                    break;
            }
        }
        //console.log("value="+value+" mid="+mid);
        return mid;
    }
    /**
     * Find the index of the RefLoc in an array
     * @param array the array to look in
     * @param ref the reference value
     * @return the index of that value in the array or -1
     */
    this.findRefIndex = function( array, ref ) {
        for ( var i=0;i<array.length;i++ )
        {
            if ( array[i].ref == ref )
                return i;
        }
        return -1;
    };
    /**
     * Get the page number currently in view and the proportion 
     * of the page visible.
     * @param div the jQuery div object to get scroll info from
     * @param lines the lines array e.g. html_lines
     * @return a string being the ref of the page, comma, and 
     * fraction of page in view
     */
    this.getPixelPage = function( div, lines )
    {
        if ( this.num_lines > 0 && lines.length > 0 )
        {
            var scrollPos = div.scrollTop();
            var scrollHt = div[0].scrollHeight;
            var maximum;
            if ( div[0].scrollTopMax != undefined )
                maximum = div[0].scrollTopMax;
            else 
                maximum = scrollHt - div.outerHeight(true);
            if ( scrollPos == 0 )
                return lines[0].ref+",0.0";
            else if ( scrollPos == maximum )
                return lines[lines.length-1].ref+",1.0";
            else
            {
                // align on middle of target window
                scrollPos += div.height()/2;
                var index = this.findHighestIndex( lines, scrollPos ); 
                var pageHeight;
                if ( index == lines.length-1)
                {
                    pageHeight = scrollHt-lines[index].loc;
                }  
                else if ( index != -1 )
                {
                    pageHeight = lines[index+1].loc-lines[index].loc;
                }              
                else
                    return lines[0].ref+",0.0";
                var pageFraction = (scrollPos-lines[index].loc)/pageHeight;
                return lines[index].ref+","+pageFraction;
            }
        }
        else if (lines !=undefined&&lines.length>0)
            return lines[0].ref+",0.0";
        else 
            return ",0.0";
    };
    /**
     * Get the source page number currently in view in the textarea, 
     * and the line-number of the central line.
     * @param src the jQuery textarea element
     * @return a string being the ref of the page, comma, and 
     * fraction of page in view
     */
    this.getSourcePage = function( src )
    {
        if ( this.num_lines > 0 && this.text_lines.length > 0 )
        {
            var scrollPos = src.scrollTop();
            var maximum;
            var scrollHt = src[0].scrollHeight;
            if ( src[0].scrollTopMax != undefined )
                maximum = src[0].scrollTopMax;
            else 
                maximum = scrollHt - src.outerHeight(true);
            if ( scrollPos == 0 )
                return this.text_lines[0].ref+",0.0";
            else if ( scrollPos >= maximum )
                return this.text_lines[this.text_lines.length-1].ref+",1.0";
            else
            {
                scrollPos += src.height()/2;
                // convert scrollPos to lines
                var lineHeight = src.prop("scrollHeight")/this.num_lines;
                var linePos = Math.round(scrollPos/lineHeight);
                //console.log("linePos="+linePos+" scrollPos="+scrollPos);
                // find page after which linePos occurs
                var index = this.findHighestIndex(this.text_lines,linePos);
                var linesOnPage;
                if ( index == this.text_lines.length-1)
                {
                    linesOnPage = this.num_lines-this.text_lines[index].loc;
                }  
                else if ( index != -1 )
                {
                    var nextPageStart = this.text_lines[index+1].loc;
                    linesOnPage = nextPageStart-this.text_lines[index].loc;
                }              
                else
                    return this.text_lines.ref+",0.0";
                var fraction = (linePos-this.text_lines[index].loc)/linesOnPage;
                return this.text_lines[index].ref+","+fraction;
            }
        }
        else
            return this.text_lines.ref+",0.0";
    };
    /**
     * Recompute the height of the images after the window is fully loaded
     */
    this.recomputeImageHeights = function()
    {
        var currHt = 0;
        this.image_lines = [];
        var editor = this;
        jQuery(".image").each( function(index) {
            var img = jQuery(this).children().first();
            var ref = img.attr("data-ref");
            var imgHeight = img.height();
         //   console.log(imgHeight);
            editor.image_lines.push( new RefLoc(ref,currHt) );    
            currHt += imgHeight;
        });
    };
    /**
     * Scroll to the specified location
     * @param loc the location to scroll to, as {page ref},{fraction}
     * @param lines an array of RefLocs defining page-break positions
     * @param elemToScroll the jQuery element to scroll
     * scale the scale to apply to locs from the lines array to target
     */
    this.scrollTo = function( loc, lines, elemToScroll, scale ) {
        var parts = loc.split(",");
        var pos;
        var index = this.findRefIndex(lines,parts[0]);
        if ( index >= 0 )
            pos = lines[index].loc*scale;
        else
            pos = 0;
        //console.log(loc);
        var pageHeight;
        if ( index == -1 )
            pageHeight = 0;
        else if ( index < lines.length-1)
            pageHeight = (lines[index+1].loc*scale)-pos;
        else
            pageHeight = elemToScroll.prop("scrollHeight")
                -(lines[index].loc*scale);
        pos += Math.round(parseFloat(parts[1])*pageHeight);
        // scrolldown one half-pagescp js mml.js
        pos -= Math.round(elemToScroll.height()/2);
        if ( pos < 0 )
        {
            //console.log("pos="+pos);
            pos = 0;
        }
        if ( elemToScroll[0].scrollTopMax !=undefined 
            && pos > elemToScroll[0].scrollTopMax )
            pos = elemToScroll[0].scrollTopMax;
        else if ( pos > elemToScroll[0].scrollHeight
            -elemToScroll[0].clientHeight )
        {
            pos = elemToScroll[0].scrollHeight-elemToScroll[0].clientHeight;
            //console.log(pos);
        }
        elemToScroll[0].scrollTop = pos; 
    };
    /**
     * Get the sum of the horizontal border, padding and optionally margin
     * @param jqObj the jQuery object to measure
     * @param marg if true add the horizontal margin values
     * @return the sum of the horizontal adjustments
     */
    this.hiAdjust = function( jqObj, marg )
    {
        var padLeft = parseInt(jqObj.css("padding-left"),10);
        var padRight = parseInt(jqObj.css("padding-right"),10);  
        var bordLeft = parseInt(jqObj.css("border-left-width"),10);
        var bordRight = parseInt(jqObj.css("border-right-width"),10);
        var margLeft = parseInt(jqObj.css("margin-left"),10);
        var margRight = parseInt(jqObj.css("margin-right"),10);
        var adjust = padLeft+padRight+bordLeft+bordRight;
        if ( marg )
            adjust += margLeft+margRight;
        return adjust;
    };
    /**
     * Part of makeInfo
     * @param name the name of the section/paragraph
     * @param prop the property it will have if any (undefined or empty)
     * @param by description of how it will be labelled
     * @return the string composed of this info
     */
    this.describeSimpleProp = function(name,prop,by) {
        var info = "<p><b>"+name+"</b> will be marked by "+by;
        if ( prop != undefined && prop.prop != undefined && prop.prop.length > 0 )
            info += ", and will be labelled '"+prop.prop+"'</p>\n";
        else
            info += ".</p>\n";
        return info;
    };
    /**
     * Get the sum of the vertical border, padding and optionally margin
     * @param jqObj the jQuery object to measure
     * @param marg if true add the vertical margin values
     * @return the sum of the vertical adjustments
     */
    this.viAdjust = function( jqObj, marg )
    {
        var padTop = parseInt(jqObj.css("padding-top"),10);
        var padBot = parseInt(jqObj.css("padding-bottom"),10);  
        var bordTop = parseInt(jqObj.css("border-top-width"),10);
        var bordBot = parseInt(jqObj.css("border-bottom-width"),10);
        var margTop = parseInt(jqObj.css("margin-top"),10);
        var margBot = parseInt(jqObj.css("margin-bottom"),10);
        var adjust = padTop+padBot+bordTop+bordBot;
        if ( marg )
            adjust += margTop+margBot;
        return adjust;
    };
    /**
     * Build the info about the dialect from the dialect description
     */
    this.makeInfo = function() {
        var help = jQuery("#help");
        var i;
        var info = "";
        info += "<h2>Novel markup for De Roberto</h2>";
        info += this.describeSimpleProp("Sections",this.dialect.sections,"two blank lines");
        info += this.describeSimpleProp("Paragraphs",this.dialect.paragraphs,"one blank line");
        info += this.describeSimpleProp("Quotations",this.dialect.quotations,
            "initial '> ', which may be nested");
        if ( this.dialect.softhyphens )
        {
            info += "<p><b>Hyphens:</b> Lines ending in '-' will be joined up, "
             +"and the hyphen labelled 'soft-hyphen', which will be invisible but "
             +"still present.</p>";
            info += "<p>Lines ending in '--' will be joined to the next line but "
            +"one hyphen will remain. These wil be labelled as 'hard-hyphens' on save.</p>";
        }
        else
            info += "<p><b>Hyphens:</b> Lines ending in '-' followed by a new line "
                 +"will <em>not</em> be joined up.</p>";
        if ( this.dialect.smartquotes )
            info += "<p>Single and double plain <b>quotation marks</b> will be converted "
                 +"automatically into curly quotes.</p>";
        else
            info += "<p>Single and double plain <b>quotation marks</b> will be left unchanged.</p>";
        if ( this.dialect.codeblocks != undefined && this.dialect.codeblocks.length > 0 )
        {
            info += "<h3>Preformatted sections</h3><p>The following are defined:</p>";
            for ( i=0;i<this.dialect.codeblocks.length;i++ )
            {
                var h = this.dialect.codeblocks[i];
                var level = i+1;
                info += "<p>A line starting with "+(level*4)+" spaces will be treated "
                    +"as preformatted and will be indented to tab-stop "+level;
                if ( h.prop != undefined && h.prop.length>0 )
                     info += ", and will be labelled '"+h.prop+"'.</p>";
                else
                     info += ".</p>";
            }
        }
        if ( this.dialect.headings != undefined && this.dialect.headings.length > 0 )
        {
            info += "<h3>Headings</h3><p>The following are defined:</p>";
            for ( i=0;i<this.dialect.headings.length;i++ )
            {
                var h = this.dialect.headings[i];
                var level = i+1;
                info += "<p>Text on a line followed by another line consisting entirely of "
                     +h.tag+" characters will be displayed as a heading level "+level;
                if ( h.prop != undefined && h.prop.length>0 )
                     info += ", and will be labelled '"+h.prop+"'.</p>";
                else
                     info += ".</p>";
            }
        }
        if ( this.dialect.dividers != undefined && this.dialect.dividers.length>0 )
        {
            info += "<p><h3>Dividers</h3>The following are defined:</p>";
            for ( i=0;i<this.dialect.dividers.length;i++ )
            {
                var d = this.dialect.dividers[i];
                if ( d.prop != undefined )
                    info += "<p>"+d.tag+" on a line by itself will be drawn in "
                         +"accordance with the stylesheet definition for '"
                         +d.prop+"', and will be labelled '"+d.prop+"'.</p>";
            }
        }
        if ( this.dialect.charformats != undefined && this.dialect.charformats.length>0 )
        {
            info += "<h3>Character formats</h3><p>The following are defined:</p>";
            for ( i=0;i<this.dialect.charformats.length;i++ )
            {
                var c = this.dialect.charformats[i];
                if ( c.prop != undefined )
                    info += "<p>Text within a paragraph that begins and ends with '"+c.tag
                         + "' will be drawn in accordance with the stylesheet definition for '"
                         + c.prop+"', and will be labelled '"+c.prop+"'.</p>";
            }
        }
        if ( this.dialect.paraformats != undefined && this.dialect.paraformats.length>0 )
        {
            info += "<h3>Paragraph formats</h3><p>The following are defined:</p>";
            for ( i=0;i<this.dialect.paraformats.length;i++ )
            {
                var p = this.dialect.paraformats[i];
                if ( p.prop != undefined && p.leftTag != undefined && p.rightTag != undefined )
                    info += "<p>Text separated by one blank line before and after, "
                         + "with '"+p.leftTag+"' at the start and '"+p.rightTag+"' at the end "
                         + "will be drawn in accordance with the stylesheet definition for "
                         + p.prop+", and will be labelled '"+p.prop+"'.</p>";
            }
        }
        if ( this.dialect.milestones != undefined && this.dialect.milestones.length>0 )
        {
            info += "<h3>Milestones</h3><p>The following are defined:</p>";
            for ( i=0;i<this.dialect.milestones.length;i++ )
            {
                var m = this.dialect.milestones[i];
                if ( m.prop != undefined && m.leftTag != undefined && m.rightTag != undefined )
                    info += "<p>A line preceded by '"+m.leftTag+"' and followed by '"+m.rightTag
                         +"' will mark an invisible dividing point that will be labelled '"
                         + m.prop+"', and will have the value of the textual content.";
                if ( m.prop=="page" )
                    info += " The page milestone will be used to align segments of the "
                        + "transcription to the preview, and to fetch page images with that name.</p>";
                else
                    info += "</p>";
            }
        }
        help = jQuery("#help");
        help.html(info);
    };
    /**
     * Resize manually to parent element width, height to bottom of screen. 
     */
    this.resize = function() {
        var imgObj = jQuery("#images");
        var srcObj = jQuery("#source");
        var helpObj = jQuery("#help");
        var tgtObj = jQuery("#target");
        var topOffset = imgObj.parent().offset().top;
        var wHeight = jQuery(window).height()-topOffset;
        var wWidth = imgObj.parent().outerWidth();
        // compute width
        imgObj.width(Math.floor(wWidth/3));
        tgtObj.width(Math.floor(wWidth/3)-this.hiAdjust(tgtObj));
        helpObj.width(Math.floor(wWidth/3)-this.hiAdjust(helpObj));
        srcObj.width(Math.floor(wWidth/3)-this.hiAdjust(srcObj));
        // compute height
        imgObj.height(wHeight);
        tgtObj.height(wHeight-this.viAdjust(tgtObj));
        helpObj.height(wHeight-this.viAdjust(helpObj));
        srcObj.height(wHeight-this.viAdjust(srcObj,true));
    };
    /**
     * Switch the display of help on or off. This replaces the textarea.
     */
    this.toggleHelp = function() {
        if ( !this.infoDisplayed )
        {
            this.infoDisplayed = true;
            jQuery("#source").css("display","none");
            jQuery("#help").css("display","inline-block");
            jQuery("#info").attr("title",self.strs.backToEditing);
            jQuery("#info").html('<i class="fa fa-edit fa-lg"></i>');
        }
        else
        {
            this.infoDisplayed = false;
            jQuery("#help").css("display","none");
            jQuery("#source").css("display","inline-block");
            jQuery("#info").attr("title",self.strs.aboutTheMarkup);
            jQuery("#info").html('<i class="fa fa-info-circle fa-lg"></i>');
        }
        this.resize();
    };
    /**
     * Save the current state of the preview to the server
     */
    this.save = function() {
        var jsonStr = JSON.stringify(this.dialect);
        var html = jQuery("#target").html();
        var obj = {
            dialect: jsonStr,
            html: html, 
        };
        jQuery("form").children().each( (function(obj) {
            return function() {
                obj[this.name] = jQuery(this).val();
            }
        })(obj));
        var url = window.location.protocol
            +"//"+window.location.host
            +"/mml/html";
        jQuery("#description").val(jQuery("#dropdown option:selected").text());
        jQuery("#version1").val(jQuery("#dropdown").val());
        jQuery.ajax( url, 
            {
                type: "POST",
                data: obj,
                success: jQuery.proxy(function(data, textStatus, jqXHR) {
                        this.saved = true;
                        this.toggleSave();
                    },this),
                error: function(jqXHR, textStatus, errorThrown ) {
                    alert("Save failed. Error: "+textStatus+" ("+errorThrown+")"+url);
                }
            }
        );
    };
    /**
     * Do whatever is needed to indicate that the document has/has not been saved
     */
    this.toggleSave = function() {
        var save = jQuery("#save");
        if ( !this.saved  )
        {
            save.removeAttr("disabled");
            save.attr("title",self.strs.saveTitle);
            save.html('<i class="fa fa-save fa-lg"></i>');  
        }
        else
        {
            save.attr("disabled","disabled");
            save.attr("title",self.strs.savedTitle);
            save.html('<i class="fa fa-check-square-o fa-lg"></i>');  
        }
    };
    /** 
     * Get the document's metadata 
     * @param after what to do when you've got it
     */
    this.getMetadata = function(after) {
        jQuery.get("http://"+window.location.hostname+"/mml/metadata/"+docid, function(data)
        {
            var md = data;
            // these mostly have no sensible defaults
            self.author = md.author;
            self.section = md.section;
            self.title = md.title;
            self.encoding = (md.encoding==null)?"utf-8":md.encoding;
            after();
        });
    };
    /**
     * Add the css from the server to this document
     */
    this.addCss = function() {
        var url = "http://"+window.location.hostname+"/mml/corform/"+this.docid;
        jQuery.get(url, function(data)
        {
            //console.log("loaded "+url+" successfully");
            jQuery("head").append('<style type="text/css">\n'+data+'\n</style>\n');
        }).fail(function(jqXHR, textStatus, errorThrown) {
           console.log("failed to load css from "+url+" "+errorThrown);
       });
    };
    /**
     * Set the encoding from the metadata into the page header
     * @param charset the new charset
     */
    this.setPageEncoding = function(charset) {
        var ct = jQuery("meta[http-equiv='Content-Type']");
        if ( ct != undefined )
            ct.remove();
        jQuery("head").add(
            '<meta http-equiv="Content-Type" content="text/html; charset='
            +charset+'">');
    };
    /**
     * Get the basic ID from docid (just language/author)
     * @return a String
     */
    this.baseID = function()
    {
        var parts = this.docid.split("/");
        if ( parts.length>= 2 )
        {
            var sb = "";
            sb += parts[0];
            sb += "/";
            sb += parts[1];
            return sb;
        }
        else
            return this.docid;
    }
    /**
     * Get the short version of the docid (language/author/work)
     * @return a shortened docid for dialect etc
     */
    this.shortID = function() {
        var parts = this.docid.split("/");
        if ( parts.length>= 3 )
        {
            var sb = "";
            sb += parts[0];
            sb += "/";
            sb += parts[1];
            sb += "/";
            sb += parts[2];
            return sb;
        }
        else
            return this.docid;
    };
    /**
     * Get the dialect for this document
     * @param docid the short docid for the dialect
     * @param after the function to call on success
     * @return a JSON document
     */
    this.getDialect = function( docid, after )
    {
        var url = "http://"+window.location.hostname+"/mml/dialects/"+docid;
        //console.log(url);
        jQuery.get(url, function(data) {
            self.dialect = JSON.parse(data);
            after();
        })
        .fail( function() {
            console.log("failed to load dialect");
        });
    }
    /**
     * Get the version list from the server and install it
     */
    this.loadVersions = function() {
        var url = "http://"+window.location.hostname+"/mml/versions?docid="
            +self.docid+"&version1="+this.version1;
        //console.log(url);
        jQuery.get(url, function(data) {
            //console.log(data);
            var json = data;
            var list = json.versions;
            var options = '';
            for ( var i=0;i<list.length;i++ )
            {
                options += '<option ';
                if ( list[i].vid == self.version1 )
                    options += ' selected';
                options += ' value="'+list[i].vid+'">';
                options += list[i].desc;
                options += '</option>';
            }
            jQuery("#dropdown").html(options);
        });
    };
    /**
     * Create a temporary toolbar at the top.
     * @return a div element with some buttons
     */
    this.createToolbar = function()
    {
        var wrapper = jQuery('<div id="toolbar-wrapper"></div>');
        var toolbar = jQuery('<div id="toolbar"></div>');
        var dropdown = jQuery('<select class="versions" title="'
            +self.strs.versionMenu+'" id="dropdown"></select>');
        // list the versions of the current docid
        wrapper.append(dropdown);
        var save = jQuery('<div title="'+self.strs.savedTitle
            +'" class="toolbar-button" disabled id="save"><i class="fa fa-check-square-o fa-lg"></div>');
        wrapper.append(save);
        var info = jQuery('<div title="'
            +self.strs.aboutTheMarkup
            +'" class="toolbar-button" id="info"><i class="fa fa-info-circle fa-lg"></div>');
        wrapper.append(info);
        toolbar.append( wrapper );
        if ( jQuery("#wrapper").is() )
            toolbar.insertBefore("#wrapper");
        else
            jQuery("#"+self.target).append(toolbar);
        jQuery("#info").click( function() {
            self.toggleHelp();
        });
        jQuery("#save").click( function() {
            self.save();
        });
        jQuery("#dropdown").change( function() {
            var newVal = jQuery("#dropdown").val();
            console.log(newVal);
            jQuery("#version1").val(newVal);
            var parts = jQuery("#dropdown").val().split("&");
            for ( var i=0;i<parts.length;i++ ) {
                var value = parts[i].split("=");
                if ( value.length== 2 )
                    jQuery("#"+value[0]).val(value[1]);
            }
            jQuery("form").submit();
        });
    }
    /**
     * Extract the docid's language key to an ISO 2-letter key
     * @return a two-letter code for supported languages or 'en' as default
     */
    this.language = function() {
        var parts = self.docid.split("/");
        if ( parts.length>0&&self.languages[parts[0]]!=undefined )
            return self.languages[parts[0]];
        else
            return 'en';
    };
    /**
     * Define all language strings for later
     * @param after the function to call on completion
     */
    this.readLanguageStrings = function(after) {
        var script_name = window.location.pathname;
        var lastIndex = script_name.lastIndexOf("/");
        if ( lastIndex !=-1 )
           script_name = script_name.substr(0,lastIndex);
        script_name += '/'+this.modpath+'/js/strings.'+this.language(docid)+'.js';
        jQuery.getScript(script_name)
        .done(function( script, textStatus ) {
            self.strs = load_strings();
            //console.log("loaded "+script_name+" successfully");
            after();
        })
        .fail(function( jqxhr, settings, exception ) {
            console.log("Failed to load language strings. status=",jqxhr.status );
        });
    };
    /**
     * Get the images for this document/version
     * @param after function to cal on completion
     */
    this.getImages = function(after)
    {
        jQuery.get("http://"+window.location.hostname+"/mml/images?docid="
            +this.docid+"&version1="+this.version1, function(data) {
            //console.log(data);
            jQuery("#wrapper").prepend(data);
            after();
        });
    }
    /**
     * Get the MML text and put it in the middle
     * @param after execute this after the function succeeds
     */
    this.getMml = function(after) {
        jQuery.get("http://"+window.location.hostname+"/mml/mml?docid="
            +this.docid+"&version1="+this.version1, function(data) {
            var textarea = jQuery('<textarea id="source"></textarea>');
            textarea.append( data );
            if ( jQuery("#help").is() )
                textarea.insertAfter(jQuery("#help"));
            else if ( jQuery("#target").is() )
                textarea.insertBefore(jQuery("#target"));
            else
                jQuery("#wrapper").append(textarea);
            after();
       });
    };
    /**
     * Create a single hidden input tag
     * @return a string being the hidden input tag text
     */
    this.hiddenInput = function( name, value ) {
        return '<input type="hidden" name="'+name+'" id="'
            +name+'" value="'+value+'"></input>';
    };
    /**
     * Write the hidden metadata needed back by the server
     */
    this.writeHiddenTags = function()
    {
        var form = jQuery('<form style="display:none" action="'
            +window.location.href+'"></form>');
        form.append(this.hiddenInput("docid",docid));
        form.append(this.hiddenInput("encoding","UTF-8"));
        form.append(this.hiddenInput("style", this.baseID()) ); 
        form.append(this.hiddenInput("format", "MVD/TEXT") );
        form.append(this.hiddenInput("section", this.section) );
        form.append(this.hiddenInput("author", this.author) );
        form.append(this.hiddenInput("title", this.title) );
        form.append(this.hiddenInput("version1", this.version1) );
        form.append(this.hiddenInput("description", jQuery("#dropdown").val()) );
        jQuery("#"+this.target).append( form );
    }
    /**
     * Load callback handlers for updating the display
     */
    this.loadHandlers = function() {
        // this sets up the timer for updating
        window.setInterval(
            (function(self) {
                return function() {
                    self.updateHTML();
                }
            // this should really reset the interval based on how long it took
            })(this),300
        );
        // force update when user modifies the source
        jQuery("#source").keyup( 
            (function(self) {
                return function() {
                    self.changed = true;
                    if ( self.saved )
                    {
                        self.saved = false;
                        self.toggleSave();
                    }
                }
            })(this)
        );
        // scroll the textarea
        jQuery("#source").scroll( 
            (function(self) {
                return function(e) {
                    // prevent feedback
                    if ( e.originalEvent )
                    {
                        var loc = self.getSourcePage(jQuery(this));
                        // console.log("loc sent to other scrollbars:"+loc);
                        self.scrollTo(loc,self.html_lines,jQuery("#target"),1.0);
                        self.scrollTo(loc,self.image_lines,jQuery("#images"),1.0);
                        //console.log(jQuery("#images")[0].scrollHeight);
                        //var height = 0;
                        //var images = jQuery(".image");
                        //for ( var i=0;i<images.length;i++ )
                        //    height += images[i].clientHeight;
                        //console.log("overall height="+height);
                    }
                }
            })(this)
        );
        // scroll the preview
        jQuery("#target").scroll(
            (function(self) {
                return function(e) {
                    if ( e.originalEvent )
                    {
                        var lineHeight = jQuery("#source").prop("scrollHeight")/self.num_lines;
                        var loc = self.getPixelPage(jQuery(this),self.html_lines);
                        self.scrollTo(loc,self.text_lines,jQuery("#source"),lineHeight);
                        // for some reason this causes feedback, but it works without!!
                        if ( self.infoDisplayed )
                            self.scrollTo(loc,self.image_lines,jQuery("#images"),1.0);
                    }
                }
            })(this)
        );
        // scroll the images
        jQuery("#images").scroll(
            (function(self) {
                return function(e) {
                    if ( e.originalEvent )
                    {
                        var lineHeight = jQuery("#source").prop("scrollHeight")/self.num_lines;
                        var loc = self.getPixelPage(jQuery(this),self.image_lines);
                        self.scrollTo(loc,self.text_lines,jQuery("#source"),lineHeight);
                        self.scrollTo(loc,self.html_lines,jQuery("#target"),1.0);
                    }
                }
            })(this)
        );
        // This will execute whenever the window is resized
        jQuery(window).resize(
            (function(self) {
                self.resize();
            })(this)
        );
    };
    /**
     * Build up the actual page
     * @param after call this if we succeed
     */
    this.composePage = function(after)
    {
        this.setPageEncoding( this.encoding );
        this.addCss();
        this.getDialect(this.shortID(),function() {
            var toolbar = self.createToolbar();
            jQuery("#target").append( toolbar );
            var wrapper = jQuery('<div id="wrapper"></div>');
            jQuery("#"+self.target).append( wrapper );
            self.getImages(function() {
                wrapper.append( '<div id="help"></div>' );
                self.getMml(function() {
                    wrapper.append('<div id="target"></div>');
                    jQuery('#'+self.target).append( wrapper );
                    self.writeHiddenTags();
                    after();
                });
           });
       });
    }
    /**
     * Post a changed event to the server
     * @param url the url to post to
     * @param service type of change: append this to the url
     * @param obj an ordinary object with name value pairs to upload
     */
    this.post_obj = function( url, service, obj, succ, fail ) {
        //console.log("posting to"+url+service+JSON.stringify(obj));
        var jqxhr = jQuery.ajax(url+service,{
            type:"POST",
            data: obj,
            success: succ,
            error: fail
        });
    };
    // build up the display
    this.readLanguageStrings(function() {
        self.getMetadata(function(){
            self.style = self.styleID();
            self.composePage(function() {
                self.loadHandlers();
                self.loadVersions();
                self.makeInfo();
                self.recomputeImageHeights();
        for ( var i=0;i<self.text_lines.length;i++ )
            console.log(self.text_lines[i].ref+","+self.text_lines[i].loc);

                /* setup window */
                self.resize();
            });
        });
    });
}
/**
 * This reads the "arguments" to the javascript file
 * @param scrName the name of the script file minus ".js"
 */
function getArgs( scrName )
{
    var scripts = jQuery("script");
    var params = new Object ();
    scripts.each( function(i) {
        var src = jQuery(this).attr("src");
        if ( src != undefined && src.indexOf(scrName) != -1 )
        {
            var qStr = src.replace(/^[^\?]+\??/,'');
            if ( qStr )
            {
                var pairs = qStr.split(/[;&]/);
                for ( var i = 0; i < pairs.length; i++ )
                {
                    var keyVal = pairs[i].split('=');
                    if ( ! keyVal || keyVal.length != 2 )
                        continue;
                    var key = unescape( keyVal[0] );
                    var val = unescape( keyVal[1] );
                    val = val.replace(/\+/g, ' ');
                    params[key] = val;
                }
            }
            return params;
        }
    });
    return params;
}
/* main entry point - gets executed when the page is loaded */
jQuery(document).ready(
    function(){
        var params = getArgs('mml.js');
        //console.log("target="+params['target']+" docid="+params['docid']+" modpath="+params['modpath']);
        var editor = new MMLEditor(params['target'],params['docid'],params['version1'],params['modpath']);
        //console.log("created editor");
    }
);
