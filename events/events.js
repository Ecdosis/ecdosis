/**
 * Search expressions store the location of a point from which to search.
 * or at which a search matches
 * @param field the field from which to search
 * @param index the panel or box index
 * @param pos the position within the string
 * @param length the length of the match (0 if not matched) 
 */
function SearchExpr( field, index, pos, length )
{
    this.field = field;
    this.index = index;
    this.pos = pos;
    this.length = length;
    var obj = this;
    /**
     * Advance to the end of the current match
     * @param event the current event
     * @return undefined if it failed else the original object
     */
    this.advance = function( event,next ) {
        if ( this.field==='title' )
        {
            if ( this.pos+this.length>= event.title.length )
            {
                this.field = 'description';
                this.pos = 0;
            }
            else
                this.pos += this.length;
            this.length = 0;
        }
        else if ( this.field == 'description' )
        {
            if ( this.pos+this.length>= event.description.length )
            {
                this.field = 'references';
                this.pos = 0;
            }
            else
                this.pos += this.length;
            this.length = 0;
        }
        else if ( this.field == 'references' )
        {
            if ( this.pos+this.length >= event.references.length )
            {
                if ( next == undefined )
                    return undefined;
                else
                {
                    this.field = 'title';
                    this.pos = 0;
                }
            }
            else
                this.pos += this.length;
            this.length = 0;
        }
        return this;
    };
}
/**
 * Object to represent events in a project
 * @param target the id of the element to add ourselves to as a child
 * @param docid the docid of the project e.g. italian/deroberto
 * @param author the name of the author
 * @param modpath the path from web-root to the events.js file
 */
function events(target,docid,author,modpath)
{
    this.target = target;
    this.modpath = modpath;
    this.selector = undefined;
    this.pDoc = undefined;
    this.docid = docid;
    this.deleted_events = undefined;
    this.search_expr = undefined;
    this.author = author;
    // event index
    this.index = 0;
    // width of event editing box
    this.boxWidth=604;
    this.languages = {italiano:'it',italian:'it',espagñol:'es',spanish:'es',english:'en'};

    this.month_days = ['','1','2','3','4','5','6','7','8','9','10','11','12',
        '13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28',
        '29','30','31'];
    var self = this;
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
    /* define all language-related strings for later */
    var script_name = window.location.pathname;
    var lastIndex = script_name.lastIndexOf("/");
    if ( lastIndex !=-1 )
       script_name = script_name.substr(0,lastIndex);
    script_name += '/'+this.modpath+'/js/strings.'+this.language(docid)+'.js';
    jQuery.getScript(script_name)
    .done(function( script, textStatus ) {
        self.strs = load_strings();
    //console.log("loaded "+script_name+" successfully");
    })
    .fail(function( jqxhr, settings, exception ) {
        console.log("Failed to load language strings. status=",jqxhr.status );
    });
    /**
     * Create a blank event (based on the previous one)
     * @param prev the previous event in the pDoc.events array
     * @return a new event object (array)
     */
    this.create_event = function(prev) {
        var event = {
            description: self.strs.empty_description,
            references: self.strs.empty_references,
            title: "",
            date: {
                qualifier: prev.date.qualifier,
                month: prev.date.month,
                day: prev.date.day,
                year: prev.date.year
            },
            type: prev.type,
            docid: self.docid,
            status: "added"
        };
        return event;
    };
    /**
     * Set the values of the event
     * @param event the event to set
     */
    this.set_event = function( event ) {
        jQuery("#title").val(event.title); 
        var qualifier = event.date.qualifier;
        if ( qualifier == "" )
            qualifier = "none";
        jQuery("#qualifier").val(qualifier);
        jQuery("#day").val(event.date.day);
        jQuery("#month").val(self.strs.month_names[event.date.month]);
        jQuery("#year").val(event.date.year);
        jQuery("#type").val(self.strs.event_types[event.type]);
        jQuery("#description").html(event.description);
        jQuery("#references").html(event.references);
    };
    /**
     * Save the current event as a preliminary to moving off it
     * @return true if it was OK
     */
    this.save_event = function() {
        var event = this.pDoc.events[this.index];
        event.title = jQuery("#title").val(); 
        event.date.qualifier = jQuery("#qualifier").val();
        event.date.day = jQuery("#day").val();
        event.date.month = this.month_to_int(jQuery("#month").val());
        event.date.year = jQuery("#year").val();
        event.type = jQuery("#type")[0].selectedIndex;
        event.description = jQuery("#description").html();
        event.references = jQuery("#references").html();
        return this.verify_date();
    };
    /**
     * Update the slider positions and max to coicide with pDoc.events 
     */
     this.update_slider = function() {
         var slider = jQuery("#slider");
         slider.slider("option","max",this.pDoc.events.length-1);
         slider.slider("option","value",this.index);
     };
    /**
     * Move the current event rightwards
     * @param amount the number of events to move by
     */
    this.move_right = function(amount) {
        if ( jQuery("div.tinyeditor").length>0 )
            self.restore_div();
        if ( this.save_event() )
        {
            // select the event to fill
            this.index += amount;
            if ( this.index >= this.pDoc.events.length )
                this.index = this.pDoc.events.length-1;
            var event = this.pDoc.events[this.index];
            this.set_event(event);
        }
    };
    /**
     * Move the current event left
     * @param amount the number of events to move left
     */
    this.move_left = function( amount ) {
        if ( jQuery("div.tinyeditor").length>0 )
            self.restore_div();
        if ( this.save_event() )
        {
            // select the event to fill
            this.index -= amount;
            if ( this.index < 0 )
                this.index = 0;
            var event = this.pDoc.events[this.index];
            this.set_event(event);
        }
    };
    /**
     * Editables are the two editable divs. They need handlers to update the
     * status in the corresponding pDoc.events array and to activate.
     * @param objs a list of editable divs to activate
     */
    this.init_editables = function( objs ) {
        // if the user clicks on it, turn it into an editor
        objs.click( function(e) {
            if ( jQuery("div.tinyeditor").length>0 )
                self.restore_div();
            if ( index != undefined )
                self.install_editor(jQuery(e.target));
        });
    };
    /**
     * Set handlers for the event type select dropdown
     * @param obj the jQuery event_type object
     */
    this.init_type_select = function(obj) {
        obj.click( function() {
            if ( jQuery("div.tinyeditor").length>0 )
                self.restore_div();
        });
        obj.change( function(e) {
            if ( self.pDoc.events[self.index].status != 'added' )
                self.pDoc.events[self.index].status = 'changed';
        });
    };
    /**
     * Set handlers for the title text input fields
     * @param obj the title jQuery object
     */
    this.init_title = function( obj ) {
        obj.attr("placeholder",self.strs.empty_title);
        obj.click( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
        });
        obj.change( function(e) {
            if ( self.pDoc.events[self.index].status != 'added' )
                self.pDoc.events[self.index].status = 'changed';
        });
    };
    /**
     * Indicate displeasure by flashing an element
     * @param elem the element wrongly used
     */
    this.flash = function( elem ) {
        elem.fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
    };
    /**
     * Check if the value of an input is empty or null
     * @param input the jQuery input control
     * @return true if it is empty or null
     */
     this.isEmpty = function(input) {
         var val = input.val();
         return val===null||val==="";
     };
    /**
     * Check that the current date is valid
     * @return true if it is OK else false
     */
    this.verify_date = function() {
        var qualifier = jQuery("#qualifier");
        var day = jQuery("#day");
        var month = jQuery("#month");
        var year = jQuery("#year");
        if ( !this.isEmpty(qualifier) )
        {
            if ( !this.isEmpty(day) )
            {
                self.flash(qualifier);
                alert(self.strs.day_and_qualifier_set);
                return false;
            }
        }
        if ( this.isEmpty(day) )
        {
            if ( this.isEmpty(qualifier) )
            {
                self.flash(day);
                alert(self.strs.day_and_qualifier_empty);
                return false;
            }
        }
        if ( this.isEmpty(month) )
        {
            if ( !this.isEmpty(day)||this.isEmpty(qualifier) )
            {
                alert(self.strs.month_empty);
                self.flash(month);
                return false;
            }
        }
        if ( this.isEmpty(year) )
        {
            alert(self.strs.year_empty);
            return false;
        }
        return true;
    };
    /**
     * Set handlers for all the date fields
     */
    this.init_date = function() {
        // there are four controls for dates!
        var qualifier = jQuery("#qualifier");
        var day = jQuery("#day");
        var month = jQuery("#month");
        var year = jQuery("#year");
        // every time someone changes a date field we must mark the 
        // pDoc.events entry as 'changed'.
        qualifier.change( function(e) {
            self.pDoc.events[self.index].status = "changed";
        });
        day.change( function(e) {
            self.pDoc.events[self.index].status = "changed";
        });
        month.change( function(e) {
            self.pDoc.events[self.index].status = "changed";
        });
        year.change( function(e) {
            self.pDoc.events[self.index].status = "changed";
        });
    }; 
    /**
     * Add a simple click-handler for the search box
     */
    this.init_search_box = function() {
        jQuery("#search_box").click( function(e) {
            self.search_expr = undefined;
        });
    };
    /**
     * Post a changed event to the server
     * @param url the url to post to
     * @param service type of change: append this to the url
     * @param obj an ordinary object with name value pairs to upload
     * @param succ success function(data, textStatus, jqXHR)
     * @param fail function(jqXHR, textStatus, errorThrown)
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
    /**
     * Read the new event data from the GUI
     * @param event the event object to update
     * @return true if the update succeeded
     */
    this.update_event = function( event ) {
        var title = jQuery("#title");
        var qualifier = jQuery("#qualifier");
        var day = jQuery("#day");
        var month = jQuery("#month");
        var year = jQuery("#year");
        var type = jQuery("#type");
        var editor = jQuery("div.tinyeditor");
        if ( editor.length==1 )
            self.restore_div();                
        event.title = title.val();
        event.type = type[0].selectedIndex;
        var date = {};
        date.qualifier = qualifier.val();
        if ( date.qualifier=="" )
           date.qualifier = "none";
        date.day = parseInt((day.val()=="")?"-1":day.val());
        date.month = self.month_to_int(month.val());
        date.year = parseInt((year.val()=="")?"0":year.val());
        event.date = date;
        event.status = (event.status=='added')?'added':'changed';
        var editables = jQuery("div.edit-region");
        if ( editables.length==2 )
        {
            var description = editables[0].innerHTML;
            var references = editables[1].innerHTML;
            if ( description==self.strs.empty_description )
                description = "";
            if ( references==self.strs.empty_references )
                references = "";
            event.description = description;
            event.references = references;
        }
        return this.verify_date();
    };
    /**
     * Compute the table from the pattern for kmp search
     * @param pat the pattern
     * @return an array of positions
     */
    this.makeKMPTable = function(pat) {
        var results = [];
        var pos = 2;
        var cnd = 0;
        results[0] = -1;
        results[1] = 0;
        while (pos < pat.length) 
        {
            if (pat[pos - 1] == pat[cnd]) 
            {
                cnd++;
                results[pos] = cnd;
                pos++;
            }
            else if (cnd > 0) 
                cnd = results[cnd];
            else 
            {
                results[pos] = 0;
                pos++;
            }
        }
        return results;
    };
    /**
     * Increment our position in the string skipping over tags
     * @param str the string to search
     * @param m the starting index
     * @param inc the amount to increment it
     */
    this.inc_m = function(str,m,inc) {
        var count = 0;
        var state = (str[m]=='<')?1:0;
        var i = (state==0)?m:m+1;
        while ( count < inc || state==1 )
        {
            switch ( state )
            {
                case 0:
                    if ( str[count+i]=='<' )
                    {
                        i++;
                        state = 1;
                    }
                    else
                        count++;
                    break;
                case 1:
                    if ( str[count+i]=='>' )
                    {
                        i++;
                        state = 0;
                    }
                    else
                        i++;
                    break;
            }
        }
        return i+count;
    };
    /**
     * Search a HTML string using kmp algorithm
     * @param str the string to search in
     * @param path the pattern to search for
     * @return the index of the match-start or -1
     */
    this.html_search = function(str,pat) {
        str = str.split('');
        pat = pat.split('');
        var index = -1;
        var m = 0;
        var i = 0;
        var T = this.makeKMPTable(pat);
        m = this.inc_m(str,m,0);
        while (m + i < str.length) 
        {
            if (pat[i] == str[m + i]) 
            {
                if (i == pat.length-1) 
                    return m;
                i++;
            } 
            else 
            {
                m = this.inc_m(str,m,i-T[i]);
                if (T[i] > -1)
                    i = T[i];
                else 
                    i = 0;
            }
        }
        return index;
    };
    /**
     * Use Javascript search to find text in titles, descriptions, references
     * @param expr the search position
     * @param pat the pattern to search for
     * @return a search expression or undefined if not found
     */ 
    this.search_from = function( expr, pat ) {
        var lim = self.pDoc.events.length;
        var event = self.pDoc.events[expr.index];
        var next = (lim==1)?undefined:self.pDoc.events[(expr.index+1)%self.pDoc.events.length];
        expr = expr.advance(event,next);            
        if ( expr != undefined )
        {
            var i;
            for ( i=0;i<lim;i++ )
            {
                var res = 0;
                if ( expr.field=='title' )
                {
                    res = event.title.substr(expr.pos).search(pat);
                    if ( res != -1 )
                    {
                        expr.pos = res;
                        expr.length = pat.length;
                        break;
                    }
                    else
                    {
                        expr.field = 'description';
                        expr.pos = 0;
                    }
                }
                if ( expr.field == 'description' )
                {
                    res = self.html_search(event.description.substr(expr.pos),pat);
                    if ( res != -1 )
                    {
                        expr.pos = res;
                        expr.length = pat.length;
                        break;
                    }  
                    else
                    {
                        expr.field = 'references';
                        expr.pos = 0;
                    }
                }
                if ( expr.field == 'references' )
                {
                    res = self.html_search(event.references.substr(expr.pos),pat);
                    if ( res != -1 )
                    {
                        expr.pos = res;
                        expr.length = pat.length;
                        break;
                    }
                    else
                    {
                        expr.index = (expr.index+1)%pDoc.events.length;
                        expr.field = 'title';
                        expr.pos = 0;
                    }
                }
                event = self.pDoc.events[expr.index];
            }
            if ( i==lim )
                expr = undefined;
        }
        return expr;
    };
    /**
     * Scroll to the position of a search hit
     * @param expr the successful search expression
    */
    this.scroll_to_hit = function( expr ) {
        this.search_expr = expr;
        var amount = expr.index-this.index;
        if ( amount >0 )
            this.move_right(amount);
        else
            this.move_left(-amount);
        this.update_slider();
    };
    /**
     * Copy the generated html into the document and set everything up
     * @param html the html to append to the target
     */
    this.setHtml = function( html )
    {
        var tgt = jQuery("#"+this.target);
        tgt.append(html);
        // now the page is built we can set up the event-handlers
        jQuery("#goleft").click( function() {
            self.move_left(1);
            self.update_slider();
        });
        jQuery("#goright").click( function() {
            self.move_right(1);
            self.update_slider();
        });
        jQuery("#search_box").click( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
        });
        // toolbar buttons
        /**
         * Add a new empty event in the GUI. Don't save it yet.
         */
        jQuery("#add_button").click( function() {
            var event = self.pDoc.events[this.index];
            var new_event = self.create_event(event);
            self.pDoc.events.splice(this.index+1,0,new_event);
            this.move_right(1);
            this.update_slider();
        });        
        /**
         * Delete an event in the GUI. If added recently just remove it, else 
         * move it to the deleted_events array for later confirmation on server. 
         * It won't be deleted until the user clicks "save".  
         */
        jQuery("#delete_button").click( function() {
            var event = self.pDoc.events[this.index];
            var deleted_items = self.pDoc.events.splice(this.index,1);
            if ( event._id != undefined && deleted_items.length>0 )
            {
                if ( self.deleted_events == undefined )
                    self.deleted_events = deleted_items; 
                else
                    self.deleted_events.push(deleted_items[0]);
            }
            if ( this.index > this.pDoc.events.length-1 )
                this.index = 0;
            this.set_event(this.pDoc.events[this.index]);
            this.update_slider();
        });        
        /**
         * Save changed, add new and delete old events on server
         */
        jQuery("#save_button").click( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
            var url = window.location.protocol+"//"+window.location.host+"/project/events/";
            var failed = undefined;
            if ( self.deleted_events != undefined )
            {
                for ( var i=0;i<self.deleted_events.length;i++ )
                {
                    var event = self.deleted_events[i];
                    var obj = {
                        _id: event._id.$oid
                    };
                    var success = function(data, textStatus, jqXHR) {
                        //console.log(data);
                        console.log("success! status="+jqXHR.status);
                    };
                    var failure = function(jqXHR, textStatus, errorThrown){
                        if ( failed == undefined )
                            failed = [];
                        failed.push(event);
                        console.log("failed status="+jqXHR.status+" errorThrown="+errorThrown);
                    }
                    self.post_obj(url,'delete',obj,success,failure);
                }
                self.deleted_events = failed;
            }
            var event = self.pDoc.events[this.index];
            if ( event.status != 'unchanged' ) {
                var service = "add";
                var oldStatus = event.status;
                if ( event.status == 'changed' )
                    service = 'update';
                if ( self.update_event(event) )
                {
                    delete event.status;
                    var jsonStr = JSON.stringify(event);
                    var obj = {
                         event: jsonStr
                    };
                    var success = function(data, textStatus, jqXHR) {
                        //console.log(data);
                        var jDoc = JSON.parse(data); 
                        var id = {$oid:jDoc._id};
                        event._id = id;
                        event.status = 'unchanged';
                        console.log("success! status="+jqXHR.status);
                    };
                    var failure = function(jqXHR, textStatus, errorThrown){
                        event.status = oldStatus;
                        console.log("failed status="+jqXHR.status+" errorThrown="+errorThrown);
                    };
                    self.post_obj(url,service,obj,success,failure);
                }
            }
        });        
        /**
         * Search in pDoc, scroll to that panel, highlight hit
         */
        jQuery("#search_button").click( function() {        
            if ( jQuery("#search_box").val().length>0 )
            {
               if ( self.search_expr == undefined )
               {
                   self.search_expr = new SearchExpr('title',this.index,0,0);
               }
               var res = self.search_from(self.search_expr,jQuery("#search_box").val());
               if ( res != undefined )
               {
                   self.search_expr = res;
                   self.scroll_to_hit(res);
                   //self.highlight_hit(res);
               }
            }
            else
                self.flash(jQuery("#search_box"));         
        });
        this.init_search_box();
        // one of these for each panel
        this.init_editables(jQuery("div.edit-region"));
        this.init_type_select(jQuery("#type"));
        this.init_title(jQuery("#title"));
        this.init_date();
    };
    /**
     * The user clicked on an editable div
     * @param the jQuery target for later restoration
     */
    this.install_editor = function( target ) {
        var content = target.html();
        if ( content == self.strs.empty_description||content==self.strs.empty_references )
            content = "";
        target.replaceWith(function(){
            return '<textarea id="tinyeditor">'+content+'</textarea>';
        });
        var editor = new TINY.editor.edit('editor', {
	    id: 'tinyeditor',
	    width: 584,
	    height: 175,
	    cssclass: 'tinyeditor',
	    controlclass: 'tinyeditor-control',
	    rowclass: 'tinyeditor-header',
	    dividerclass: 'tinyeditor-divider',
	    controls: ['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', '|',
		    'orderedlist', 'unorderedlist', '|', 'outdent', 'indent', '|', 'leftalign',
		    'centeralign', 'rightalign', 'blockjustify', '|', 'unformat', '|', 'undo', 'redo', 'n',
		    'font', 'size', 'style', '|', 'image', 'hr', 'link', 'unlink'],
	    footer: true,
	    fonts: ['Verdana','Arial','Georgia','Trebuchet MS'],
	    xhtml: true,
            bodyid: 'editor',
	    footerclass: 'tinyeditor-footer',
	    toggle: {text: 'source', activetext: 'wysiwyg', cssclass: 'toggle'},
	    resize: {cssclass: 'resize'}
        });
    };
    /**
     * Remove the editor and restore the old div with the new text
     */
    this.restore_div = function() {
        var iframe = jQuery("#tinyeditor").next();
        var html = iframe[0].contentDocument.documentElement;
        var content = html.lastChild.innerHTML;
        var class_name = "edit-region";
        if ( content=='<br>' )
        {
            var parent = iframe.closest("tr");
            if ( parent.next("tr").length!= 0)
                content = self.strs.empty_description;
            else
                content = self.strs.empty_references;
        }
        jQuery("div.tinyeditor").replaceWith('<div class="'+class_name+'">'+content+'</div>');
        if ( self.pDoc.events[this.index].status != 'added' )
            self.pDoc.events[this.index].status = 'changed';
        jQuery(self.selector).click( function(e) {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
            var editables = jQuery("div.edit-region");
            var length = editables.length;
            var index = editables.index( e.target );
            if ( index != undefined )
                self.install_editor("div.edit-region:eq("+index+")");
        });
    };
    /**
     * Make a dropdown (select) menu
     * @param items the array of items
     * @param value the item value to select
     * @param sel_id an id for the select element (optional)
     */
    this.make_dropdown = function( items, value, sel_id )
    {
        var html = '<select';
        if ( sel_id != undefined )
            html += ' id="'+sel_id+'"';
        html += '>';
        for ( var i=0;i<items.length;i++ )
        {
            html += '<option value="'+items[i]+'"';
            if ( items[i]==value )
                html += " selected";
            html += '>'+items[i]+'</option>';
        }     
        html += '</select>';
        return html;
    };
    /**
     * Make a text-input box
     * @param text the initial text for it
     * @param name the id for the box
     */
    this.make_text = function( text, name )
    {
        return '<input type="text" id="'+name+'" value="'+text+'"></input>';
    };
    /**
     * Based on the localised month-name determine its numeric value
     * @param name the localised name of the month
     */
    this.month_to_int = function( name ) {
        for (var i=0;i<this.strs.month_names.length;i++ )
            if ( this.strs.month_names[i]==name )
                return i;
       return 0;
    }
    /**
     * Make a single row in the table containing input elements
     * @param type the type of row content
     * @param value different types of value for the input elements
     * @param id for text input rows
     */
    this.compose_row = function( type, value, id )
    {
        var html = "";
        switch ( type )
        {
            case 'text':
                html = '<tr><td colspan="2"><input ';
                if ( id != undefined )
                    html += 'id="'+id+'" ';
                html += 'type="text" value="'+value+'"></input></td></tr>';
                break;
            case 'date':
                html += '<tr><td>'+this.make_dropdown(this.strs.qualifiers,(value.qualifier=='none')?'':value.qualifier,'qualifier');
                html += this.make_dropdown(this.month_days,value.day.toString(),'day');
                html += this.make_dropdown(this.strs.month_names,(value.month>=0)?this.strs.month_names[value.month+1]:'','month');
                html += this.make_text(value.year.toString(),'year');
                html += '</td><td>'+this.make_dropdown(this.strs.event_types,this.strs.event_types[id],"type");
                html += '</td></tr>';
                break;
            case 'textarea':
                if ( value.length==0 )
                {
                    if ( id=='description' )
                        value = self.strs.empty_description;
                    else if ( id=='references' )
                        value = self.strs.empty_references;
                }
                html += '<tr><td colspan="2"><div id="'+id+'" class="edit-region">'+value+'</div></td></tr>';
                break;
        }
        return html;
    };
    /**
     * Make the top-toolbar
     */
    this.make_toolbar = function() {
        var  html = '<div id="event_toolbar">';
        html += '<div id="left-toolbar-group">';
        html += '<div title="'+self.strs.add_event+'" id="add_button" class="event-button"><i class="fa fa-plus-square fa-lg"></i></div>';
        html += '<div title="'+self.strs.delete_event+'" id="delete_button" class="event-button"><i class="fa fa-minus-square fa-lg"></i></div>';
        html += '<div title="'+self.strs.save+'" id="save_button" class="event-button"><i class="fa fa-save fa-lg"></i></div>';
        html += '<input class="filler" type="text"></input>';
        html += '</div><div id="right-toolbar-group">';
        html += '<input id="search_box" type="text">';
        html += '<div title="'+self.strs.search+'" id="search_button" class="event-button"><i class="fa fa-search fa-lg"></i></div>';
        html += '</div></div>\n';
        return html;
    };
    /**
     * Create a box to contain an event
     * @param event the event from the event array downloaded
     */
    this.create_box = function( event ) {
        var html = '<div class="box">';
        html += '<table>';
        html += self.compose_row('text',event.title,'title'); 
        html += self.compose_row('date',event.date,event.type);
        html += self.compose_row('textarea',event.description,'description');
        html += self.compose_row('textarea',event.references,'references');
        html += '</table>\n';
        html += '<div id="slider"></div>';
        html += '</div>';
        return html;
    };
    /**
     * Install and configure the slider control
     */
    this.install_slider = function() {
        jQuery("#slider").slider({min:0});
        jQuery("#slider").slider("option","max",self.pDoc.events.length-1);
        jQuery("#slider").slider("option","step",1);
        jQuery("#slider").on("slidechange",function(event,ui) {
            var value = jQuery("#slider").slider("value");
            var amount = value-self.index;
            if ( amount > 0 )
                self.move_right(amount);
            else if ( amount < 0 )
                self.move_left(-amount);
        });
    };
    /* Download all the events in compact form for this project */
    jQuery.get( "http://"+window.location.hostname+"/project/events/"+docid, function(data)
    {
        //console.log(data);
        self.pDoc = JSON.parse(data);
        var html = '<div class="events">';
        html += '<div id="left-sidebar"><i id="goleft" class="fa fa-chevron-left fa-3x"></i></div>';
        var events = self.pDoc.events;
        if ( events != undefined )
        {
            html += '<div id="centre_panel">\n';
            html += self.make_toolbar();
            for ( var i=0;i<events.length;i++ )
            {
                events[i].status = 'unchanged';
            }
            html += self.create_box(events[0]);
            html += '</div>';
        }
        html += '<div id="right-sidebar"><i id="goright" class="fa fa-chevron-right fa-3x"></i></div>';
        html += "</div>";
        self.setHtml(html);
        self.install_slider();
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
jQuery(function(){
    // DOM Ready - do your stuff 
    var params = getArgs('events.js');
    var editor = new events(params['target'],params['docid'],params['author'],params['modpath']);
}); 
