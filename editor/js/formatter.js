/**
 * Represent both the converted HTML and the original MML as a 
 * linked list, where common text is preserved at the points where 
 * it diverges. This is to speed up conversion and also to allow 
 * correspondences between the MML and HTML to be used during editing.
 * @param text the text of the link
 * @param next the next link
 * @param prev the previous link
 */
function Link(text,next,prev)
{
    this.text = text;
    this.next = next;
    this.prev = prev;
    this.preHtml = "";
    this.postHtml = "";
    this.preMml = "";
    this.postMml = "";
    /* may be true = 'open blk tag, false = 'close blk tag, undefined = not a block format */
    this.isBlkStart = undefined; 
    this.isBlkEnd = undefined; 
    /**
     * Convert this link and all its subsequent ones into HTML
     */
    this.toHtml = function() {
        var temp = this;
        var html = "";
        while ( temp != null )
        {
            html += temp.preHtml;
            html += temp.text;
            html += temp.postHtml;
            temp = temp.next;
        }
        return html;
    };
    /**
     * Convert this link and all subsequent ones into the original textarea text
     * @param until if null igore else convert only until this link
     * @return the original textarea contents
     */
    this.toMml = function(until) {
        var temp = this;
        var mml = "";
        while ( temp != until && temp != null )
        {
            mml += temp.preMml;
            mml += temp.text;
            mml += temp.postMml;
            temp = temp.next;
        }
        return mml;
    };
    /**
     * Set the link'stext to a new value
     * @param text the new text
     */
    this.setText = function(text){
        this.text = text;
    };
    /**
     * Does this link contain no actual text until the next node?
     * @param end the final node of the sequence    
     * @return true if it was empty
     */
    this.isEmpty = function(end) {
        var temp = this;
        while ( temp != null )
        {
            for ( var i=0;i<temp.text.length;i++ )
            {
                var c = temp.text.charAt(i);
                if ( c!='\t'||c!=' '||c!= '\n' )
                    return false;
            }
            temp = temp.next;
        }
        return true;
    };
    /**
     * Add someHTML to the very start of the link
     * @param html the HTML tag to add
     */
    this.prependHtml = function( html ) {
        this.preHtml = html + this.preHtml;
    };
    /**
     * Add some MML to the very start of the link
     * @param mml the mml tag
     */
    this.prependMml = function( mml ) {
        this.preMml = mml + this.preMml;
    };
    /**
     * Add some HTML to the end of the link
     * @param html the HTML tag to add
     */
    this.appendHtml = function( html ) {
        this.postHtml += html;
    };
    /**
     * Add some MML to the end of the link
     * @param mml the mml tag
     */
    this.appendMml = function( mml ) {
        this.postMml += mml;
    };
    /**
     * Trim the leas=ding LF off the leading html if present
     */
    this.trimLF = function() {
        if ( this.preHtml.length>0 && this.preHtml[0]=='\n' )
            this.preHtml = this.preHtml.substr(1);
    };
    /**
     * Split a link at a known place
     * @param pos the offset into the text of the link to split at
     * @param numDel number of character to delete after split point
     * @return the new link in the middle
     */
    this.split = function(pos,numDel) {
        var left = this.text.substr(0,pos);
        var right = this.text.substr(pos+numDel);
        var link = new Link(right,this.next,this);
        // moved right hand features to link
        link.postHtml = this.postHtml;
        this.postHtml = "";
        link.postMml = this.postMml;
        this.postMml = "";
        link.isBlkEnd = this.isBlkEnd;
        this.isBlkEnd = undefined; 
        this.text = left;
        this.next.prev = link;
        this.next = link;
        return link;
    };
    /**
     * Used by print: abbreviate the text content of a link
     * @param text the text to abbreviate
     */
    this.abbrev = function(text) {
        if ( text.length > 10 )
            return text.substr(0,5)+"..."+text.substr(text.length-6);
        else
            return text;
    }
    /**
     * Print an abbreviated version of the list to th console
     */
    this.print = function() {
        var temp = this;
        while ( temp != null )
        {
            console.log("\""+temp.preHtml+"\"|\""+temp.preMml
                +"\""+this.abbrev(temp.text)+this.postHtml+this.postMml+"->");
            temp = temp.next;
        }
    };
    /**
     * Static function: does a piece of text end with a string?
     * @param text the text to test
     * @param str the string it may end with
     * @return true if it does
     */
    this.endsWith = function(text,str) 
    {
        return text.length>=str.length
            &&text.substr(text.length-str.length)==str;
    };
    /**
     * Static function: does a piece of text start with a string?
     * @param text the text to test
     * @param str the string it may start with
     * @return true if it does
     */
    this.startsWith = function(text,str)
    {
        return text.length>=str.length
            &&text.substr(0,str.length)== str;
    };
    /**
     * Is this line marked up as a lineformat?
     * @param lfs the self of lineformats from the dialect
     * @return the lineformat object or false
     */
    this.isLineformat = function(lfs) {
        var best = false;
        var trimLR = this.text;
        trimLR = trimLR.trim();
        for ( var i=0;i<lfs.length;i++ )
        {
            var lf = lfs[i];
            if ( this.endsWith(trimLR,lf.rightTag) 
                && this.startsWith(this.text,lf.leftTag) )
            {
                if ( !best )
                    best = lf;
                else
                {
                    var lDiff = lf.leftTag.length - best.leftTag.length;
                    var rDiff = lf.rightTag.length - best.rightTag.length;
                    if ( lDiff+rDiff > 0 )
                        best = lf;
                }
            }
        }
        return best;
    };
    /**
     * This link is the start of a block
     * @param value true if this is a block link else false
     */ 
    this.setBlkStart = function( value ) {
        this.isBlkStart = value;
    };
    /**
     * Get the block start status
     * @return value true if this is a block link else false
     */ 
    this.getBlkStart = function() {
        return (this.isBlkStart==undefined)?false:this.isBlkStart;
    };
    /**
     * This link is the end of a block
     * @param value true if this is an end of block
     */ 
    this.setBlkEnd = function( value ) {
        this.isBlkEnd = value;
    };
    /**
     * Get the link end block status
     * @return value true if this is an end of block
     */ 
    this.getBlkEnd = function() {
        return (this.isBlkEnd==undefined)?false:this.isBlkEnd;
    };
}
/**
 * Format an MML text into HTML using a dialect
 * @param dialect the dialect to use
 */
function Formatter( dialect ) 
{
    /** dialect file of MML */
    this.dialect = dialect;
    /** quote chars for smartquotes */
    this.quotes = {"'":1,"‘":1,"’":1,'"':1,'”':1,'“':1};
    /** number of lines in textarea source */
    this.num_lines = 0;
    /** flag to indicate we are NOT busy */
    this.ready = true;
    /** conversion table from mml offsets to html base text ones */
    this.mmlToHtml = undefined;
    /** html tags defining blocks NB sorted!*/
    this.blkTags = ["div","h1","h2","h3","h4","h5","h6","p","pre"];
    /**
     * Build quick lookup arrays for making headings
     */
    this.buildHeadLookup = function() {
        this.heads = {};
        for ( var i=0;i<this.dialect.headings.length;i++ )
        {
            if ( this.dialect.headings[i].prop != undefined 
                && this.dialect.headings[i].tag != undefined )
            {
                this.heads[this.dialect.headings[i].tag] 
                    = this.dialect.headings[i].prop;    
            }
        } 
    };
    /**
     * Build quick lookup for character formats
     */
     this.buildCfmtLookup = function() {
        var cfmts = this.dialect.charformats;
        this.cfmts = {};
        for ( var k=0;k<cfmts.length;k++ )
        {
            var cfmt = cfmts[k];
            if ( cfmt.tag != undefined )
                this.cfmts[cfmt.tag] = (cfmt.prop!=undefined)?cfmt.prop:cfmt.tag;
        }
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
     * Search for and replace all character formats in the paragraph
     * @param para the lead link of the paragraph
     * @param end the next paragraph or end-link
     */ 
    this.processCfmts = function(para,end)
    {
        if ( this.dialect.charformats != undefined )
        {
            var trimNextLF = false;
            var stack = new Array();
            var line = para.next;
            while ( line != null && line != end )
            {
                var text = line.text;
                // trim leading LF after hyphen
                if ( trimNextLF )
                {
                    if ( line.trimLF() )
                        trimNextLF = false;
                }
                var i = 0;
                while ( i<text.length )
                {
                    var c = text[i++];
                    if ( c in this.cfmts )
                    {
                        var link = line.split(i-1,1);
                        if ( this.peek(stack)==c )
                        {
                            stack.pop();
                            line.appendHtml('</span>');
                            link.prependMml(c);
                        }
                        else
                        {
                            stack.push(c);
                            link.prependHtml('<span class="'
                                +this.cfmts[c]
                                +'" title="'+this.cfmts[c]+'">');
                            link.prependMml(c);
                        }
                        line = link;
                        text = line.text;
                        i = 0;
                    }
                    else if ( c == '-' && text.substr(i)=="\n" )
                    {
                        var link = line.split(i-1,1);
                        var hyphen = new Link("-",link,line);
                        hyphen.prependHtml('<span class="soft-hyphen">');
                        line.next = hyphen;
                        link.setText("");
                        link.mml = "\n";
                        link.prev = hyphen;
                        link.appendHtml('</span>');
                        line = link;    // needed for loop termination
                        text = line.text;
                        trimNextLF = true;
                        i = 0;
                    } 
                }
                line = line.next;
            }
        }
    };
    /**
     * Find start of tag
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
        while ( i>=0 && j >= 0 )
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
     * Is the given tag a HTML block tag?
     * @param tag the html tag lowercased
     * @return true is it is else false
     */
    this.isBlkTag = function( tag ) {
        var top = 0;
        var bot = this.blkTags.length-1;
        while ( bot >= top )
        {
            var mid = Math.floor((top+bot)/2);
            if ( tag < this.blkTags[mid] )
                bot = mid-1;
            else if ( tag > this.blkTags[mid] )
                top = mid+1;
            else
                return true;
        }
        return false;
    };
    /**
     * Scan the start and end of the paragraph for defined para formats.
     * @param para the link leading into the paragraph 
     * @param end the link of the next paragraph
     * @return the name of the paragraph property or the empty string if none
     */
    this.processPfmts = function( para, end )
    {
        var pfmt;
        if ( this.dialect.paraformats != undefined )
        {
            var pfmts = this.dialect.paraformats;
            var line = para.next;
            for ( var i=0;i<pfmts.length;i++ )
            {
                pfmt = pfmts[i];
                if ( pfmt.leftTag != undefined && pfmt.rightTag != undefined )
                {
                    var ltag = pfmt.leftTag;
                    var lpos = this.startPos(para.next.text,ltag);
                    if ( lpos != -1 )
                    {
                        var rtag = pfmt.rightTag;
                        var last = end.prev;
                        while ( last != para && last != null )
                        {
                            var rpos = this.endPos(last.text,rtag);
                            if ( rpos != -1 )
                            {
                                line.setText(line.text.substr(lpos+ltag.length));
                                line.mml += para.next.text.substr(0,lpos+ltag.length);
                                last.prependMml(last.text.substr(rpos));
                                // recompute
                                rpos = this.endPos(last.text,rtag);
                                last.setText(last.text.substr(0,rpos));
                                if ( this.isBlkTag("p") )
                                {
                                    line.setBlk(true);
                                    last.setBlk(false);
                                }
                                break;
                            }
                            last = last.prev;
                        }
                    }
                    else
                        pfmt = undefined;
                }
            }
        }
        return (pfmt==undefined)?"":pfmt.prop;
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
     * Process setext type headings (we don't do atx). 
     * @param para the link whose content needs its headings processed
     * @param end the start of the next paragraph or link
     */
    this.processHeadings = function( para, end )
    {
        if ( this.dialect.headings !=undefined )
        {
            var res = "";
            var link = para.next;
            while ( link != end && link != null )
            {
                var ms;
                var line = link.text;
                if ( line.length > 0 )
                {
                    var c = line.charAt(0);
                    // process headings
                    if ( c in this.heads && this.isHeading(line,c) )
                    {
                        var tag = this.cssMap[this.heads[c]];
                        if ( tag == undefined )
                        {
                            tag = "h1";
                            console.log("couldn't find tag for "+this.heads[c]);
                        }
                        var attr = ' class="'+this.heads[c]+'" title="'+this.heads[c]+'"';
                        link.prev.prependHtml('<'+tag+attr+'>');
                        link.prependMml( link.text );
                        link.setText("");
                        link.prev.appendHtml('</'+tag+'>\n');
                        if ( this.isBlkTag(tag) )
                        {
                            link.prev.setBlkStart(true);
                            link.prev.setBlkEnd(true);
                        }
                    }
                }
                link = link.next;
            }
        }
    };
    /**
     * Convert smart quotes as fast as possible. Do this first.
     * @param para the Link containing the paragraph
     * @param para the next paragraph node
     */
    this.processSmartQuotes = function( para, end )
    {
        var hasLF = false;
        if ( this.dialect.smartquotes )
        {
            var link = para;
            var text = link.text;
            for ( var i=0;i<text.length;i++ )
            {
                var c = text[i];
                if ( this.isQuote(c) )
                {
                    var prev = text[i-1];
                    // this doesn't change the length of the text
                    if ( i==0||(this.isSpace(prev)
                        ||this.isOpeningQuote(prev)||this.isOpeningBracket(prev)) )
                        text = text.slice(0,i)+this.openQuote(c)+text.slice(i+1);
                    else
                        text = text.slice(0,i)+this.closeQuote(c)+text.slice(i+1);
                }
            }
            link.setText(text);
        }        
    };
    /**
     * Process the line format contained in the current line
     * @param lf the lineformat definition from the dialect
     * @param link the link containing a lineformat
     */
    this.processLineformat = function( lf, link ) {
        var hasLF = false;
        var line = link.text;
        if ( line.length>0&&line[line.length-1]=='\n')
            hasLF= true;
        var end = line.length;
        if ( lf.rightTag.length > 0 )
            end = this.endPos(line,lf.rightTag);
        link.setText(line.slice(lf.leftTag.length,end));
        if ( hasLF )
            line += '\n';        
    };
    /**
     * Close a previously open tag
     * @param line the line link object
     * @param lf the line format
     */
    this.terminateTag = function( line, lf ) {
        var tag = this.cssMap[lf.prop];
        if ( this.isBlkTag(tag) )
            line.setBlkEnd(true);
        line.appendHtml('</'+tag+'>');
        line.appendMml(lf.rightTag);
    };
    /**
     * Close a previously open tag
     * @param line the line link object
     * @param lf the line format
     */
    this.commenceTag = function( line, lf ) {
        var tag = this.cssMap[lf.prop];
        if ( this.isBlkTag(tag) )
            line.setBlkStart(true);
        attr = ' class="'+lf.prop+'"';
        line.prependHtml ('<'+tag+attr+'>');
        line.prependMml( lf.leftTag );
    };
    /**
     * Turn a paragraph into a linked list of lines
     * @param para the paragraph link
     * @param end the next paragraph link
     */
    this.processLines = function( para, end ) {
        var lfs = this.dialect.lineformats;
        var lines = para.text.split("\n");
        if ( lines.length > 0 && lfs != undefined )
        {
            var prev = para;
            para.setText("");
            for ( var i=0;i<lines.length;i++ )
            {
                this.num_lines++;
                var text=(i==lines.length-1)?lines[i]:lines[i]+"\n";
                var line = new Link(text,null,prev);
                var lf=line.isLineformat(lfs);
                if ( lf )
                {
                    this.processLineformat(lf,line);
                    this.commenceTag(line,lf);
                    this.terminateTag(line,lf);
                }
                prev.next = line;
                prev = line;
            }
            end.prev = line;
            line.next = end;
        }
    };
    /**
     * Process a list of paragraphs in a section
     * @param para the first paragraph to process
     * @param end the ending para
     */
    this.processPara = function( para, end )
    {
        this.processSmartQuotes(para,end);
        this.processLines(para,end);
        this.processHeadings(para,end);
        var name = this.processPfmts(para,end);
        this.applyGlobals(para,end);
        this.processCfmts(para,end);
        // see if we used a block-format above
        if ( name.length == 0 )
        {
            if ( this.dialect.paragraph != undefined 
                && this.dialect.paragraph.prop != undefined )
                name = this.dialect.paragraph.prop;
            else
                name = "p";
        }
        return name;
    };
    /**
     * Wrap a paragraph divided into lines/spans etc in a para tag
     * @param para the first link of the para
     * @param next the next tag
     * @param name the ame of the tag
     */
    this.wrapParagraph = function( para, next, name ) {
        var temp = para;
        var state = 0;
        while ( temp != next && temp != null )
        {
            switch ( state )
            {
                case 0: // looking for start pfmt
                    if ( temp.text.length > 0 )
                    {
                        if ( !temp.getBlkStart() )
                            temp.prependHtml('<p class="'+name+'" title="'+name+'">');
                        if ( !temp.getBlkEnd() )
                            state = 1;
                        // else shouldn't happen, but if it does, stay in state 0
                    }
                    break;
                case 1: //looking for end block
                    if ( temp.getBlkStart() )
                        temp.prev.appendHtml('</p>');
                    // if isBlkStart it has already got a start tag
                    // if isBlkEnd already has an end tag
                    if ( temp.getBlkEnd() ) // NB can be same link
                        state = 0;
                    break;
            }
            temp = temp.next;
        }
        if ( state == 1 )
            next.prev.appendHtml('</p>');
    };
    /**
     * Process all the paras in a section
     * @param section the Link containing the section
     * @param end the end-section or end-marker
     */
    this.processSection = function( section, end )
    {
        // strip leading new lines
        while ( section.text.length > 0 && section.text.indexOf("\n")==0 )
        {
            section.setText(section.text.substr("\n".length));
            section.mml += "\n"; // preserve for length calculation
            this.num_lines++;
        }
        var text = section.text;
        var state = 0;
        var savedText = section.text;
        section.setText( "" );
        var prev = new Link("",null,section);
        section.next = prev;
        var breakText = ""; 
        var lastPos = 0;
        // we can't use split because some split points
        // are "\n \n" or "\n    \n" and regular expressions
        // won't let us recover what the split string was
        for ( var i=0;i<text.length;i++ )
        {
            var c = text[i];
            switch ( state )
            {
                case 0:
                    if ( c == '\n' )
                    {
                        state = 1;
                        breakText = '\n';
                    }
                    break;
                case 1:
                    if ( c == '\n' )
                    {
                        var endPos = i-breakText.length;
                        prev.setText( text.substr(lastPos,endPos-lastPos) );
                        breakText += c;
                        var link = new Link("",null,prev);
                        //link.prependHtml(breakText);
                        prev.next = link;
                        lastPos = endPos+breakText.length;
                        prev = link;
                        state = 0;
                    }
                    else if ( c != ' ' && c != '\t' )
                        state = 0;
                    else
                        breakText += c;
                    break;               
            }
        }
        prev.setText( text.substr(lastPos) );
        prev.next = end;
        end.prev = prev;
        /*var mmlText = section.toMml(end);
        if ( mmlText.substr(0,3) == "\n\n\n" )
            mmlText = mmlText.substr(3);
        this.compare( savedText, mmlText );*/
        // process all paragraphs in this section
        var temp = section.next;
        while ( temp != end )
        {
            var next = temp.next;
            var name = this.processPara(temp,next);
            this.wrapParagraph(temp,next,name);
            if ( next != end )
                this.num_lines += 2;
            temp = next;
        }
    };
    /** 
     * Does this section only contains white space?
     * @param section the text of the section
     * @return true
     */
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
     * Make a 2-element array reference out of the current offset object
     * @param mml the mml offset
     * @param html the html base text offset
     * @return a 2-element array being mml,html base text offsets
     */
    this.makeReference = function(mml,html) {
        var array = new Array(2);
        array[0] = this.offset.mml;
        array[1] = this.offset.html;
    };
    /**
     * Debug
     */
    this.sequence = function(t,i) {
        var arr = new Array(13);
        arr[0] = t.charCodeAt(i-6);
        arr[1] = t.charCodeAt(i-5);
        arr[2] = t.charCodeAt(i-4);
        arr[3] = t.charCodeAt(i-3);
        arr[4] = t.charCodeAt(i-2);
        arr[5] = t.charCodeAt(i-1);
        arr[6] = t.charCodeAt(i);
        arr[7] = t.charCodeAt(i+1);
        arr[8] = t.charCodeAt(i+2);
        arr[9] = t.charCodeAt(i+3);
        arr[10] = t.charCodeAt(i+4);
        arr[11] = t.charCodeAt(i+5);
        arr[12] = t.charCodeAt(i+5);
        arr[13] = t.charCodeAt(i+5);
        arr[14] = t.charCodeAt(i+6);
        var res = "";
        for ( var j=0;j<arr.length;j++ )
        {
            res += arr[j];
            if ( j < arr.length-1 )
                res += ",";
        }
        return res;
    };
    /**
     * Compare one text with another - debug
     * @param t1 the first text
     * @param t2 its supposed copy
     */
    this.compare = function( t1, t2 ) {
        var lineNo = 1;
        var charNo = 0;
        for ( var i=0;i<t1.length&&i<t2.length;i++ )
        {
            if ( t1.charAt(i) != t2.charAt(i) )
            {
                console.log("texts differ line "+lineNo+" char "+charNo);
                console.log("t1:"+this.sequence(t1,i));
                console.log("t2:"+this.sequence(t2,i));
                console.log("t1:"+t1.substr(i,10));
                console.log("t1:"+t2.substr(i,10));
                console.log("offending character is t1:"+t1.charCodeAt(i)+" t2:"+t2.charCodeAt(i));
                break;
            }
            else if ( t1.charAt(i)=='\n' )
            {
                lineNo++;
                charNo=0;
            }
            else
                charNo++;
        }
        if ( t1.length != t2.length )
            console.log("texts differ in length: "+t1.length+" vs "+t2.length);
    };
    /**
     * Count the number of lines in some text - debug
     * @param text the text to count \ns in
     */
    this.countLines = function(text) {
        var count = 0;
        for ( var i=0;i<text.length;i++ )
            if ( text[i]=='\n' )
                count++;
        return count;
    };
    /**
     * Compute the offsets between HTML, MML and plain text
     * @param first the first link
     */
    this.computeCorrespondences = function(first) {
        var link = first;
        var textPos = 0;
        var htmlPos = 0;
        var mmlPos = 0;
        this.mmlToHtml = new Array();
        var i = 0;
        while ( link != null )
        {
            var entry = {};
            entry.mml = mmlPos;
            entry.html = htmlPos;
            entry.text = textPos;
            this.mmlToHtml.push(entry);
            mmlPos += link.preMml.length + link.text.length + link.postMml.length;
            textPos += link.text.length;
            htmlPos += link.preHtml.length + link.text.length + link.postHtml.length;
            link = link.next;
            i++;
        }
    };
    /**
     * Convert an offset from one coordinate system to another
     * http://programmerspatch.blogspot.com.au/2014_08_01_archive.html
     * @param value the offset in the from field
     * @param from the key for value
     * @param to the corresponding field to be output
     * @return the corresponding offset in the to field
     */
    this.getOffset = function(value,from,to) {
        var top = 0;
        var bot = this.mmlToHtml.length-1;
        var mid=0;
        while ( top <= bot )
        {
            mid = Math.round((top+bot)/2); 
            if ( value < this.mmlToHtml[mid][from] )
            {
                if ( mid == 0 )
                    return -1;  
                else
                    bot = mid-1;
            }
            else  
            {
                if ( mid == this.mmlToHtml.length-1 )
                    break;
                else if ( value >= this.mmlToHtml[mid+1][from] )
                    top = mid+1;
                else 
                    break;
            }
        }
        return value-this.mmlToHtml[mid][from]+this.mmlToHtml[mid][to];
    };
    /**
     * Is this a string consisting only of whitespace?
     * @param str the string to test
     * @return true if it is else false
     */
    this.isWhitespaceString = function( str ) {
        var res = true;
        for ( var i=0;i<str.length;i++ )
        {
            if ( !/\s/.test(str[i]) )
            {
                res = false;
                break;
            }
        }
        return res;
    };
    /**
     * Is this an alphanumeric character?
     * @param c the character to test
     * @return true if it is else false
     */
    this.isAlphanumeric = function( c ) {
        return (c>='a'&&c<='z')
            ||(c>='A'&&c<='Z')
            || (c>'0'&&c<='9')
            ||c=='_';
    };
    /**
     * Read an optional section name at the start of a section
     * @param section the text of the section
     * @return an object containing the name read and the consumed MML text
     */
    this.readSectionName = function( section ) {
        var state = 0;
        var ret = {};
        ret.tag = "";
        ret.mml = "";
        for ( var i=0;i<section.length;i++ )
        {
            var c = section[i];
            switch ( state )
            {
                case 0: // looking for "{"
                    if ( !/\s/.test(c) )
                    {
                        if ( section[i]=='{' )
                            state = 1;
                        else
                            state = -1;
                    }
                    break;
                case 1: // seen '{'
                    if ( c == '}' )
                        state = 2;
                    else if ( this.isAlphanumeric(c) )
                        ret.tag += c;
                    else
                    {
                        ret.tag = "";
                        ret.mml = "";
                        state = -1;
                    }
                    break;
                case 2: // reading NL after name
                    if ( c!=' '&&c!='\t' )
                    {
                        if ( c=='\n'|| c=='\r' )
                            state = -1;
                        // DOS line-endings
                        else if (i<section.length-1&&c=='\r'&&section[i+1]=='\n')
                        {
                            ret.mml += '\r';
                            state = -1;
                        }
                        else
                        {
                            ret.mml = "";
                            ret.tag = "";
                            state = -1;
                        }
                    }
                    break;
            }
            if ( state == -1 )
                break;
        }
        return ret;
    };
    /**
     * Parse section names to determine what nests inside what
     * @param ret an array of named section objects, updated on exit
     */
    this.parseSectionNames = function( ret )
    {
        if ( ret.length > 0 )
        {
            var stack = new Array();
            for ( var i=0;i<ret.length;i++ )
            {
                var sectionName = (ret[i].tag.length==0)?"section":ret[i].tag;
                ret[i].divStart = '<div class="'+sectionName+'">';
                ret[i].divEnd = "";
                if ( stack.length > 0 )
                {
                    // if anonymous pop everything off stack
                    if ( ret[i].tag.length==0 )
                    {
                        while ( stack.length > 0 )
                        {
                            ret[i-1].divEnd += '</div>';
                            stack.pop();
                        }
                    }
                    else
                    {
                        // if already on the stack, pop back to it
                        var index = stack.indexOf(sectionName);
                        if ( index >= 0 )
                        {
                            var numToPop = stack.length-index;
                            for ( var j=0;j<numToPop;j++ )
                            {
                                stack.pop();
                                ret[i-1].divEnd += '</div>';
                            }
                        }
                        // else it will nest
                    }
                }
                stack.push(sectionName);                    
            }
            // close open divs
            while ( stack.length > 0 )
            {
                ret[ret.length-1].divEnd += '</div>';
                stack.pop();
            }
        }
    };
    /**
     * Sort globals by decreasing length before applying them
     */
    this.sortGlobals = function() {
        var a = this.dialect.globals;
        for (var h = a.length; h = parseInt(h / 2);) {
            for (var i = h; i < a.length; i++) {
                var k = a[i];
                for (var j=i;j>=h && k.seq.length>a[j-h].seq.length; j-=h)
                    a[j] = a[j-h];
                a[j] = k;
            }
        }
        return a;
    };
    /**
     * Build a map of properties to their html tag names
     */
    this.buildCssMap = function(){
        this.cssMap = {};
        for ( var i=0;i<document.styleSheets.length;i++ )
        {
            var rules;
            if ( document.styleSheets[i].cssRules )
                rules = document.styleSheets[i].cssRules;
            else if ( document.styleSheets[i].rules )
                rules = document.styleSheets[i].rules;
            for ( var j=0;j<rules.length;j++ )
            {
                if ( "selectorText" in rules[j] && rules[j].selectorText != undefined  
                    && rules[j].selectorText.match(/[a-z0-9]+\.[a-z\-0-9]+/) )
                {
                    var index = rules[j].selectorText.indexOf("\.");
                    var tag = rules[j].selectorText.substr(0,index);
                    var prop = rules[j].selectorText.substr(index+1);
                    this.cssMap[prop] = tag;
                }
            }
        }
    };
    /**
     * Preprocess the text by swapping all the global changes
     * @param first the first link
     * @param last the last link
     */
    this.applyGlobals = function( first, last ) {
        var rexeps = Array();
        for ( var i=0;i<dialect.globals.length;i++ )
            rexeps.push( new RegExp(dialect.globals[i].seq, 'g') );
        var temp = first;
        while ( temp != null && temp != last )
        {
            for ( var i=0;i<this.dialect.globals.length;i++ )
            {
                var rep = dialect.globals[i].rep;
                if ( temp.text != null 
                    && temp.text.indexOf(dialect.globals[i].seq) != -1 )
                {
                    temp.setText( temp.text.replace(rexeps[i], rep) );
                }
            }
            temp = temp.next;
        }
    };
    /**
     * Split the text into sections of text bounded by 3 newlines
     * @param text the text to split
     * @return an array of sections, each containing non-whitespace
     */
    this.splitIntoSections = function(text) {
        var sections = Array();
        var current = "";   
        var state = 0;
        var pending = '';
        for ( var i=0;i<text.length;i++ )
        {
            var token = text[i];
            switch ( state )
            {
                case 0: // looking for non-whitespace
                    if ( !/\s/.test(token) )
                        state = 1;
                    current += token;
                    break;
                case 1: // seen some non-whitespace
                    if ( token == '\n')
                    {
                        state = 2;
                        pending = '\n';
                    }
                    else
                        current += token;
                    break;
                case 2: // seen one \n after non-whitespace
                    if ( !/\s/.test(token) )
                    {
                        state = 1;
                        pending += token;
                        current += pending;
                    }
                    else 
                    {
                        if ( token == '\n' )
                            state = 3;
                        pending += token;
                    }
                    break;
                case 3: // seen two \n's after non-whitespace
                    if ( !/\s/.test(token) )
                    {
                        state = 1;
                        pending += token;
                        current += pending;
                    }
                    else 
                    {
                        if ( token == '\n' )
                        {
                            sections.push(current);
                            current= '';
                            state = 0;
                        }
                        pending += token;
                    }
                    break;
            }
        }
        if ( current.length > 0 && !this.isWhitespaceString(current) )
            sections.push( current );
        return sections;
    };
    /**
     * Convert the MML text into HTML
     * @param text the MML text to convert
     * @return HTML
     */
    this.toHTML = function(text)
    {
        var startTime = new Date().getMilliseconds();
        var html = "";
        var first=null;
        this.num_lines = 0;
        this.sortGlobals();
        this.buildHeadLookup();
        this.buildCfmtLookup();
        this.buildCssMap();
        var sections = this.splitIntoSections(text);
        if ( sections.length > 0 )
        {
            var additional_lines = 0;
            var ret = new Array(sections.length);
            for ( var i=0;i<sections.length;i++ )
                ret[i] = this.readSectionName(sections[i]);
            for ( var i=0;i<ret.length;i++ )
                this.parseSectionNames(ret);
            first = null;
            var link = null;
            for ( var i=0;i<sections.length;i++ )
            {
                var prev = link;
                var prefix = (i==0)?"":"\n\n\n";
                link = new Link(sections[i].substr(ret[i].mml.length),null,prev);
                link.prependMml(prefix+ret[i].mml);
                // save original sections in array
                sections[i] = link;
                // html div now added below
                if ( first == null )
                    first = link;
                else
                    prev.next = link;
            }
            // we need this to close the final div
            link.next = new Link("",null,link);
            sections.push( link.next );
            // now process the list
            var temp = first;
            var last = null;
            while ( temp != null )
            {
                var next = temp.next;
                if ( next != null )
                {
                    if ( !this.isEmptySection(temp.text) )
                        this.processSection(temp,next);
                    else
                        this.num_lines += this.countLines(temp.text);
                    this.num_lines+=3;
                }
                last = temp;
                temp = next;
            }
            // now wrap the HTML safely in start and end divs
            for ( var i=0;i<ret.length+1;i++ )
            {
                // last section is just a place-holder for end
                if ( i < sections.length-1 )
                    sections[i].prependHtml(ret[i].divStart);
                // don't end first section; end last section
                if ( i > 0 )
                    sections[i].prependHtml(ret[i-1].divEnd);
            }
        }
        this.computeCorrespondences(first);
        var endTime = new Date().getMilliseconds();
        //console.log("time to format="+(endTime-startTime));
        //this.compare( text, first.toMml() );
        //console.log("num_lines="+this.num_lines);
        return first.toHtml();
    };
}
