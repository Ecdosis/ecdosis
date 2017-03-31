/**
 * Annotator for MML Editor and other tools
 * @param target the target id of the associated editor/viewer on screen
 * @param toolbar the id of the toolbar list for buttons
 */
function Annotator( target, toolbar, user )
{
    this.target = target;
    this.toolbar = toolbar;
    this.user = user;
    this.currentId = "";
    this.emptyTags = {"br":1,"img":2};
    var self = this;
    var parent = jQuery("#"+target);
    var fullWidth = jQuery(window).width();
    while ( fullWidth - parent.width() > 10)
        parent = parent.parent();
    if ( parent != null && parent.length > 0 )
        parent.css("position","relative");
    jQuery("#"+target).append('<div id="annotator"><div id="annotate-header"></div><div class="annotator-scrollpane"></div></div>');
    var div = jQuery("#annotator");
    div.css("top",parent.offset().top+"px");
    div.height(jQuery(window).height()-parent.offset().top);
    var targetWidth = jQuery("#"+target).width();
    var maxWidth = (Math.round((0.95*fullWidth-targetWidth)/2));
    div.css("min-width",(0.4*maxWidth)+"px");
    div.css("max-width",maxWidth+"px");
    div.css("width","30em");
    var header = jQuery("#annotate-header");
    header.append('<p id="annotate-close"><i title="close" class="fa fa-times fa-1x"></i></p><p>Notes</p>');
    /**
     * Click in the annotator window NOT in the current editable note
     */
    jQuery("#annotator").click(function(e){
        var ann = jQuery(e.target);
        if ( ann.attr("class")!="annotation" )
            ann = jQuery(e.target).parents(".annotation");
        if ( ann.length==0  || (ann.attr("id") != self.currentId 
            && self.currentId.length>0) )
        {
            self.collapseNote(self.currentId);
        }
    });
    /**
     * Mark that the document is dirty once we type a key 
     * in an editable field
     */
    jQuery("#annotator").keypress(function(e){
        var elem = jQuery(e.target);
        if ( elem.attr("contenteditable")=="true" )
        {
            var note = elem.parents(".annotation");
            if ( note.length==1 )
                note.attr("data-saved","false");
        }
    });
    /**
     * Close or hide the annotation window
     */
    jQuery("#annotate-close").click(function(e){
        jQuery("#annotator").hide();
        self.appendToToolbar("annotate-button","view notes","fa-comments-o");
        jQuery("#annotate-button").click(function(e){
            jQuery("#annotator").show();
            self.removeFromToolbar("annotate-button");
        });
    });
    /**
     * Add an icon tothe toolbar
     * @param id the ID of the button
     * @param title the hove-info string
     * @param icon the fa-icon name
     */
    this.appendToToolbar = function(id,title,icon){
        var li = '<li id="'+id+'"><i title="'+title+'" class="fa '+icon+' fa-1x"></i></li>';
        var items = jQuery("#"+self.toolbar+" li");
        items.last().before(li);
    };
    /**
     * Remove an icon from the toolbar
     * @param id the id of the button to remove
     */
    this.removeFromToolbar = function(id){
        jQuery("#"+id).remove();
    };
    /**
     * Generate a unique id for this work and make sure that it is 
     * @return a unique 8-character id for this docid
     */
    this.uniqueId = function(){
        var val ="";
        var unique = true;
        do
        {
            var min = Math.ceil(68719476736);   //2^36
            var max = Math.floor(137438953472);   //2^37
            val = Math.floor(Math.random() * (max - min)) + min;
            jQuery(".annotation").each(function(){
                var id= jQuery(this).attr("id");
                var index = id.lastIndexOf("/");
                if ( index != -1 )
                {
                    var otherId = id.substring(index+1);
                    if ( val == otherId )
                        unique = false;
                }
            });
        } while ( !unique );
        return val.toString(36);
    };
    /**
     * Add an icon to the toolbar
     * @param tb the jQuery toolbar object
     * @param id the id of the button
     * @param icon the fa-name
     */
    this.addToToolbar = function( tb, id, icon ) {
        var ind = icon.lastIndexOf("-");
        var title = icon;
        if ( ind != -1 )
            title = icon.substring(ind+1);
        tb.append('<i id="'+id+'" class="fa '+icon+' fa-1x" title="'+title+'"></i>');
        var button = jQuery("#"+id);
        var wd = button.width();
        var ht = button.height();
        var extra = 2;
        if ( wd < ht )
        {
            var padding = Math.round((ht-wd)/2);
            button.css("padding-left",(padding+extra)+"px");
            padding = (ht - wd)-padding;
            button.css("padding-right",(padding+extra)+"px");
            button.css("padding-top",extra+"px");
            button.css("padding-bottom",extra+"px");
        }
        else
            button.css("padding",extra+"px");
    };
    /**
     * Compute the absolute offset of an annotation's anchor
     * @param id the id of the note
     * @return the absolute offset in the underlying MML
     */
    this.getAbsoluteOffset = function(id) {
        var currOffset = 0;
        var finalOffset = 0;
        jQuery(".annotation").each(function(e){
            var curr = jQuery(this);
            var relOff = parseInt(curr.attr("data-offset"));
            currOffset += relOff;
            if ( curr.attr("id") == id )
            {
                finalOffset = currOffset;
                return false;
            }
        });
        return finalOffset;
    };
    /**
     * Highlight the selection corresponding to this note's anchor
     * @param id the id of the note to highlight the selection of
     */
    this.highlightSelection = function(id) {
        var note = jQuery("#"+id);
        var offset = this.getAbsoluteOffset(id);
        var nWords = parseInt(note.attr("data-nwords"));
        var oldNWords = nWords;
        var text = jQuery(".editbox-active").val();
        var state = 0;
        var end = offset;
        for ( var i=offset;i<text.length;i++ )
        {
            switch (state)
            {
                case 0: // initial state: seen no text yet
                    if ( !/[ \t\n\r]/.test(text[i]) )
                        state = 2;
                    break;
                case 1: // seen space, looking for text
                    if ( !/] \t\n\r]/.test(text[i]) )
                        state = 2;
                    break;
                case 2: // seen text, looking for space
                    if ( /[ \t\n\r]/.test(text[i]) )
                    {
                        nWords--;
                        state = 1;
                    }
                    break;
            }
            if ( nWords == 0 )
                break;
            end++;
        }
        //console.log("highlighting from "+offset+" to "+end+" (nwords="+oldNWords+")");
        var eb = jQuery(".editbox-active");
        eb.setSelection(offset,end);
        if ( eb.is(":focus") )
            eb.blur();
        eb.focus();
    };
    /**
     * Replace the digest with the fully-expanded note
     * @param id the id of the note to expand
     */
    this.expandNote = function(id){
        var savedNote = jQuery("#"+id+" .saved-note");
        if ( savedNote.length==1 )
        {
            var noteText = jQuery("#"+id+" .notecontent");
            noteText.empty();
            savedNote.contents().appendTo(noteText);
            savedNote.remove();
        }
        if ( !jQuery("#"+id).hasClass("expanded") )
            this.highlightSelection(id);
        jQuery("#"+id).addClass("expanded");
    };
    /**
     * Reduce the note to a digest (saving the original in a hidden element)
     * @param id the id of the note to collapse
     */
    this.collapseNote = function(id){
        var note = jQuery("#"+id);
        var box = note.find(".notecontent");
        if (box.attr('contenteditable')=='true')
        {
            box.attr('contenteditable','false');
            note.find(".note-toolbar").remove();
            note.find(".notetitle").show();
        }
        var text = box.html();
        var digest = this.digestNote(text);
        if ( jQuery("#"+id+" .saved-note").length==0 && digest.length < text.length )
        {
            jQuery("#"+id).append('<div class="saved-note"></div>');
            box.contents().appendTo(note.children(".saved-note").first());
            box.empty();
            box.append(digest);
        }
        jQuery("#"+id).removeClass("expanded");
    };
    /**
     * Reduce a piece of HTML to a 20-word digest that is syntactically correct
     * @param html a lengthy piece of HTML
     * @return the digested HTML
     */
    this.digestNote = function(html){
        var stack = Array();
        var nWords = 0;
        var state =0;
        var digest = "";
        var tag = "";
        var spaces = /[ \n\r\t]/g;
        var i = 0;
        if ( html == undefined || html.length==0 )
            console.log("html is empty");
        while ( i<html.length && state >= 0 )
        {
            var ch = html[i++];
            switch ( state )
            {
                case 0:
                    if ( ch == '<')
                    {
                        tag = "";
                        state = 1;
                    }
                    else if ( spaces.test(ch) )
                        state = 3;
                    break;
                case 1:
                    if ( ch == '/')
                        state = 2;
                    else if ( spaces.test(ch) )
                    {
                        if ( !(tag in this.emptyTags) )
                        {
                            stack.push(tag);
                            state = 4;
                        }
                    }
                    else if ( ch == '>' )
                    {
                        if ( !(tag in this.emptyTags) )
                        {
                            stack.push(tag);
                        }
                        state = 0;
                    }
                    else
                        tag += ch;
                    break;
                case 2:
                    if ( ch == '>' )
                    {
                        stack.pop();
                        state = 0;
                    }
                    break;
                case 3:
                    if ( !spaces.test(ch) )
                    {
                        nWords++;
                        if ( nWords == 20 )
                        {
                            state = -1;
                            digest += "...";
                        }
                        else if ( ch == '<' )
                        {
                            tag = "";
                            state = 1;
                        }
                        else
                            state = 0;
                    }
                    break;
                case 4: // attributes
                    if ( ch == '>' )
                        state = 0;
                    break;
            }
            if ( state >= 0 )
                digest += ch;
        }
        while ( stack.length>0 )
            digest += '</'+stack.pop()+'>';
        return digest;
    };
    /**
     * Calitalise the first letter of a name
     * @param name the name
     * @return the calitalised name
     */    
    this.capitalise = function(name){
        return name[0].toUpperCase()+name.substring(1);
    };
    /**
     * Collapse all currently exapnded notes
     * @param exceptId don't collapse this one
     */
    this.collapseAll = function(exceptId) {
        jQuery(".expanded").each(function(){
            var thisId = jQuery(this).attr("id");
            if ( thisId != exceptId )
                self.collapseNote(thisId);
        });
    };
    /**
     * Add event handlers for the note
     * @param id the id of the note in question
     */
    this.addNoteHandlers = function(id){
        // single click on annotation: expand note
        jQuery("#"+id+" .notecontent").click(function(e){
            self.collapseAll(id);
            self.expandNote(id);
            if ( self.currentId.length > 0 && self.currentId != id )
            {
                self.collapseNote(self.currentId);
                self.currentId = id;
            }
            e.stopPropagation();
            //note = jQuery("#"+id);
            //console.log(jQuery._data( note, "events" ));
        });
        // double click indicates "edit"
        var content = jQuery("#"+id+" .notecontent");
        content.dblclick(function(e){
            // deactivate previous active note if any
            var presentNote = jQuery("#"+self.currentId);
            if ( presentNote.length > 0 )
            {
                var toolbar = presentNote.find(".note-toolbar");
                if ( toolbar.length==1 )
                    toolbar.remove();
                jQuery("#"+self.currentId+" .notetitle").show();
                presentNote.find(".notecontent").attr("contenteditable","false");
            }
            else
                console.log("no present note found");
            var box = jQuery(this);
            self.currentId = id;
            if ( box.attr('contenteditable')!='true' )
            {
                var children = box.parent().children("div");
                if ( children.length==1 )
                {
                    box.parent().parent().find(".notetitle").hide();
                    box.before('<div class="note-toolbar"></div>');
                    var toolbar = jQuery("#"+id).find('.note-toolbar');
                    self.addToToolbar(toolbar,"italic-button","fa-italic");
                    self.addToToolbar(toolbar,"bold-button","fa-bold");
                    self.addToToolbar(toolbar,"strikethrough-button","fa-strikethrough");
                    self.addToToolbar(toolbar,"link-button","fa-link");
                    self.addToToolbar(toolbar,"unlink-button","fa-unlink");
                    // handle clicks
                    jQuery("#italic-button").mousedown(function(e){
                        document.execCommand('italic', false, null);
                        e.preventDefault();
                    });
                    jQuery("#bold-button").mousedown(function(e){
                        document.execCommand('bold', false, null);
                        e.preventDefault();
                    });
                    jQuery("#strikethrough-button").mousedown(function(e){
                        document.execCommand('strikethrough', false, null);
                        e.preventDefault();
                    });
                    jQuery("#link-button").mousedown(function(e){
                        var link = prompt("Type or paste link", "");
                        if ( link.length != 0 )
                            document.execCommand('createLink', false, link);
                        e.preventDefault();
                    });
                    jQuery("#unlink-button").mousedown(function(e){
                        document.execCommand('unLink', false, null);
                        e.preventDefault();
                    });
                    toolbar.click(function(e){
                        e.stopPropagation();
                    });
                }
                box.attr('contenteditable','true');
                box.focus();
            }
            e.stopPropagation();
            self.saved = false;
        });
    };
    /**
     * Find the note whose absolute offset is greater than or equal to the one given
     * @param absOffset the absolute offset to find the note of
     * @param equals the offset can be equals as well as greater than
     * @return null if not found or a jQuery annotation object
     */
    this.noteGreater = function(absOffset,equals) {
        var currOffset = 0;
        var obj = null;
        jQuery(".annotation").each(function(){
            var curr = jQuery(this);
            var relOff = parseInt(curr.attr("data-offset"));
            currOffset += relOff;
            if ( (!equals && currOffset > absOffset) 
            || (equals && currOffset >= absOffset) )
            {
                obj = curr;
                return false;
            }
        });
        return obj;
    };
    this.noteGreaterThan = function(absOffset) {
        return this.noteGreater(absOffset,false);
    };
    this.noteGreaterThanOrEquals = function(absOffset) {
        return this.noteGreater(absOffset,true);
    };
    /**
     * Find the range of notes that cover a selection range
     * @param start the start of the range
     * @param end the end of the range
     * @return an array of note objects in sequence
     */
    this.noteRange = function(start,end) {
        var currOffset = 0;
        var obj = null;
        var list = Array();
        jQuery(".annotation").each(function(){
            var curr = jQuery(this);
            var relOff = parseInt(curr.attr("data-offset"));
            currOffset += relOff;
            if ( currOffset > start && currOffset < end )
            {
                curr.attr("data-absoffset",currOffset);
                list.push( curr );
            }
            else if ( currOffset >= end )
            {
                curr.attr("data-absoffset",currOffset);
                list.push( curr );
                return false;
            }
        });
        return list;
    };
    /**
     * Compute the relative offset from an absolute one for a new note. 
     * @param absOffset the absolute off of the new note
     * @return the relative offset of the new note
     */
    this.getRelativeOffset = function(absOffset){
        var currOffset = 0;
        var answer = 0;
        jQuery(".annotation").each(function(){
            var curr = jQuery(this);
            var relOff = parseInt(curr.attr("data-offset"));
            if ( currOffset + relOff >= absOffset )
            {
                answer = absOffset - currOffset;
                return false;
            }
            else
                currOffset += relOff;
        });
        return answer;
    };
    /**
     * Add an empty note for the user to fill in
     * @param where the location of the note in the text
     */
    this.addEmptyNote = function(where) {
        var id = this.uniqueId();
        var relOff = this.getRelativeOffset(where.offset);
        var note = '<div id="'+id
            +'" class="annotation"'
            +' data-offset="'+relOff
            +'" data-version="'+where.version
            +'" data-nwords="'+where.nWords
            +'" data-docid="'+where.docid
            +'" data-saved="false'
            +'"></div>';
        // insert BEFORE the first note whose absolute offset is greater
        var beforeNote = this.noteGreaterThan(where.offset);
        if ( beforeNote == null )
            jQuery("#annotator .annotator-scrollpane").append(note);
        else
        {
            beforeNote.before(note);
            // adjust reloff of next note
            var currRelOff = parseInt(beforeNote.attr("data-offset"));
            currRelOff -= relOff;
            beforeNote.attr("data-offset",currRelOff);
        }
        var note = jQuery("#"+id);
        note.append('<div class="notetitle"></div>');
        note.children(".notetitle").append('<p>'+this.capitalise(this.user)+'</p>');
        note.append('<div class="notetext"><div class="notecontent"><p>Enter text</p></div></div>');
        this.addNoteHandlers(id);
    };
    /**
     * Save the annotations to the server
     */
    this.save = function(){
        //1. compose all annotations into JSON
        var annotations = Array();
        var anns = jQuery(".annotation");
        anns.each(function(){
            var ann = jQuery(this);
            var currOffset = 0;
            if ( ann.attr("data-saved") == "false" )
            {
                var item = {};
                item.docid = ann.attr("data-docid");
                item.version = ann.attr("data-version");
                item.nwords = ann.attr("data-nwords");
                // convert offsets to absolute for saving
                item.offset = currOffset + parseInt(ann.attr("data-offset"));
                currOffset = item.offset;
                item.id = ann.attr("id");
                item.owner = ann.children(".notetitle").text();
                var text = ann.find(".notecontent").html();
                var savedNote = ann.children(".saved-note").html();
                item.text = (savedNote!=undefined)?savedNote:text;
                annotations.push(item);
            }
            // else not modified
        });
        //2. POST them to the service
        var obj = {};
        if ( annotations.length > 0 )
        {
            obj.data = JSON.stringify(annotations);
            jQuery.post("http://"+window.location.hostname+"/annotations/",
                obj, function(data){
                if ( data == "OK" )
                {
                    jQuery(".annotation").each(function(){
                        jQuery(this).attr("data-saved","true");
                    });
                    self.saved = true;
                }
                else
                {
                    alert("failed to save annotations! (message: "+data+")");
                }
             }).fail(function(){
                 console.log("save annotations failed");
             });
        }
    };
    /**
     * Get the id component from the docid
     * @param docid the document identifier
     * @return the last component of the docid being its 'id'
     */
    this.splitDocid = function(docid) {
        var parts = Array();
        var index = docid.lastIndexOf("/");
        if ( index != -1 )
        {
            parts.push(docid.substring(0,index));
            parts.push(docid.substring(index+1));
            return parts;
        }
        else
            return false;
    };
    /**
     * Sort incoming annotations by their absolute offsets
     */
    this.sortByOffset = function(a){
        for (var h = a.length; h = parseInt(h / 2);) {
            for (var i = h; i < a.length; i++) {
                var k = a[i];
                for (var j = i; j >= h && k.offset < a[j-h].offset; j -= h)
                    a[j] = a[j - h];
                a[j] = k;
            }
        }
    };
    /**
     * Load the annotations from the server
     */
    this.load = function(docid){
        jQuery("#annotator .annotation").remove();
        //console.log(jQuery(".annotation").length+" annotations left");
        var url = "http://"+window.location.hostname+"/annotations/?docid="+docid;
        jQuery.get(url,function(data){
            //console.log("retrieved "+data.length+" annotations");
            self.sortByOffset(data);
            // convert to relative offsets
            var currOffset = 0;
            for ( var i=0;i<data.length;i++ )
            {
                var old = data[i].offset;
                data[i].offset -= currOffset;
                currOffset = old;
            }
            for ( var i=0;i<data.length;i++ )
            {
                var ann = data[i];
                var parts = self.splitDocid(ann.docid);
                if ( parts )
                {
                    var note = '<div id="'+parts[1]
                        +'" class="annotation expanded"'
                        +' data-offset="'+ann.offset    // NB:relative
                        +'" data-version="'+ann.version
                        +'" data-nwords="'+ann.nwords
                        +'" data-docid="'+parts[0]
                        +'" data-saved="true'
                        +'"></div>';
                    jQuery("#annotator .annotator-scrollpane").append(note);
                    var note = jQuery("#"+parts[1]);
                    note.append('<div class="notetitle"></div>');
                    note.children(".notetitle").append('<p>'+ann.owner+'</p>');
                    note.append('<div class="notetext"><div class="notecontent">'+ann.text+'</div></div>');
                    self.addNoteHandlers(parts[1]);
                }
                // else the split failed: DON'T load that note
            }
            self.collapseAll("");
        });
    };
    /**
     * Is there at least one annotation that needs saving?
     * @return true if one or more annotaitons need saving
     */
    this.isDirty = function() {
        var saved = true;
        jQuery(".annotation").each(function(){
            if ( jQuery(this).attr("data-saved") == "false" )
                saved = false;
        });
        return saved == false;
    };
    /**
     * The user typed some visible keycode. Selection was empty.
     * @param start the start offset in the textarea
     */
    this.keyTyped = function(start) {
        var note = this.noteGreaterThan(start);
        if ( note != null )
        {
            var relOff = parseInt(note.attr("data-offset"));
            note.attr("data-offset",relOff+1);
        }
        //console.log("set data-offset to "+(relOff+1));
    };
    /**
     * Add a range of chars to the text
     * @param start the absolute start offset
     * @param len the number of chars to be added
     */
    this.addRange = function(start,len) {
        var note = this.noteGreaterThan(start);
        if ( note != null )
        {
            var relOff = parseInt(note.attr("data-offset"));
            note.attr("data-offset",relOff+len);
        }
    };
    /**
     * The user backspaced once. Selection is empty.
     * @param start the start offset in the text
     */
    this.doBackspace = function(start) {
        var note = this.noteGreaterThanOrEquals(start);
        if ( note != null )
        {
            var relOff = parseInt(note.attr("data-offset"));
            if ( relOff > 0 )
                note.attr("data-offset",relOff-1);
        }
    };
    /**
     * The user pressed forward delete once. Selection is empty.
     * @param start the start offset in the text
     */
    this.doDelete = function(start) {
        var note = this.noteGreaterThan(start);
        var relOff = parseInt(note.attr("data-offset"));
        if ( relOff > 0 )
            note.attr("data-offset",relOff-1);
    };
    /**
     * Delete the current selection. Any notes whose offsets fall within 
     * the selection must be shifted left by end-start characters
     * @param start the selection start-offset
     * @param end the end-selection offset
     */
    this.deleteSelection = function( start, end ) {
        var notes = this.noteRange(start,end);
        if ( notes.length > 0 )
        {
            var relOff = parseInt(notes[0].attr("data-offset"));
            var absOff = parseInt(notes[0].attr("data-absoffset"));
            notes[0].removeAttr("data-absoffset");
            notes[0].attr("data-offset",relOff-(end-start));
            for ( var i=1;i<notes.length;i++ )
            {
                absOff = parseInt(notes[i].attr("data-absoffset"));
                if ( absOff < end )
                    notes[i].attr("data-offset",0);
                else
                    notes[i].attr("data-offset",absOff-end);
                notes[i].removeAttr("data-absoffset");
            }
        }
    };
}
