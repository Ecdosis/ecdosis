/**
 * Object to represent events in a project
 * @param target the id of the element to add ourselves to as a child
 * @param docid the docid of the project e.g. italian/deroberto
 * @param author the name of the author
 */
function events(target,docid,author)
{
    this.target = target;
    this.selector = undefined;
    this.pDoc = undefined;
    this.deleted_events = undefined;
    this.author = author;
    this.save="save";
    this.delete_event="delete event";
    this.add_event="add event";
    this.search="search";
    this.boxWidth=604;
    this.invalid_date_msg = "Please correct this date before saving";
    this.month_days = ['','1','2','3','4','5','6','7','8','9','10','11','12',
        '13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28',
        '29','30','31'];
    this.month_names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep',
        'Oct','Nov','Dec'];
    this.qualifiers = ['','early','late','by','perhaps','circa'];
    this.event_types = ['biography','composition','letter'];
    var self = this;
    /**
     * Create a blank event (based on the previous one)
     * @param prev the previous event in the pDoc.events array
     * @return a new event object (array)
     */
    this.create_event = function(prev) {
        var event = {
            description: "",
            references: "",
            title: "",
            date: {
                qualifier: prev.date.qualifier,
                month: prev.date.month,
                day: prev.date.day,
                year: prev.date.year
            },
            type: prev.type,
            status: "added"
        };
        return event;
    };
    /**
     * Execute a scroll right - we need this in 2 places
     * @param amount the number of pixels to scroll
     */
    this.do_scroll_right = function(amount) {
        if ( jQuery("#tinyeditor").length>0 )
            self.restore_div();
        var origAmt = jQuery("#wire_frame").scrollLeft();
        var afterAmt = origAmt+amount;
        if ( afterAmt < 0 )
            afterAmt = 0;
        else
        {
            var new_index = Math.floor((afterAmt+self.boxWidth-1)/self.boxWidth);
            afterAmt = new_index*self.boxWidth;
        }
        jQuery("#wire_frame").scrollLeft(afterAmt);
    };
    /**
     * Execute a scroll left - put here to match do_scroll_right
     * @param amount the number of pixels to scroll
     */
    this.do_scroll_left = function( amount ) {
        if ( jQuery("#tinyeditor").length>0 )
            self.restore_div();
        var origAmt = jQuery("#wire_frame").scrollLeft();
        var afterAmt = origAmt-amount;
        if ( afterAmt < 0 )
            afterAmt = 0;
        else
        {
            var new_index = Math.floor((afterAmt+self.boxWidth-1)/self.boxWidth);
            afterAmt = new_index*self.boxWidth;
        }
        jQuery("#wire_frame").scrollLeft(afterAmt);
    };
    /**
     * Editables are the two editable divs. They need handlers to update the
     * status in the corresponding pDoc.events array and to activate.
     * @param objs a list of editable divs to activate
     */
    this.init_editables = function( objs ) {
        // if the user clicks on it, turn it into an editor
        objs.click( function(e) {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
            var editables = jQuery("div.edit-region");
            var length = editables.length;
            var index = editables.index( e.target );
            if ( index != undefined )
                self.install_editor("div.edit-region:eq("+index+")");
        });
        // if the value changes, update pDoc
        objs.change( function(e) {
            var editables = jQuery("div.edit-region");
            var index = editables.index(e.target)/2;
            if ( self.pDoc.events[index].status != 'added' )
                self.pDoc.events[index].status = 'changed';
        });
    };
    /**
     * Set handlers for the event type select dropdown
     * @param objs a list of event type selector jQuery objects
     */
    this.init_type_selects = function(objs) {
        objs.click( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
        });
        objs.change( function(e) {
            var types = jQuery("select.type_select");
            var index = types.index(e.target);
            if ( self.pDoc.events[index].status != 'added' )
                self.pDoc.events[index].status = 'changed';
        });
    };
    /**
     * Set handlers for the title text input fields
     * @param objs a list of jQuery objects
     */
    this.init_titles = function( objs ) {
        objs.click( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
        });
        objs.change( function(e) {
            var titles = jQuery("input.title_box");
            var index = titles.index(e.target);
            if ( self.pDoc.events[index].status != 'added' )
                self.pDoc.events[index].status = 'changed';
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
     * Check that the current date is valid
     * @param index the box index
     * @return true if it is OK else false
     */
    this.verify_date = function(index) {
        var qualifier = jQuery("select.qualifier:eq("+index+")");
        var day = qualifier.next("select.date_day");
        var month = day.next("select.date_month");
        var year = month.next("input.year");
        if ( qualifier.val() != "" )
        {
            if (day.val()!="")
            {
                self.flash(qualifier);
                return false;
            }
        }
        if ( day.val()=="" )
        {
            if ( qualifier.val()=="" )
            {
                self.flash(day);
                return false;
            }
        }
        if ( month.val()=="" )
        {
            if ( day.val()!=""||qualifier.val()=="" )
            {
                self.flash(month);
                return false;
            }
        }
        if ( year.val()=="" )
            return false;
        return true;
    };
    /**
     * Set handlers for all the date fields
     * @param index the current box index to select (optional)
     */
    this.init_dates = function( index ) {
        // there are four controls for dates!
        var days,months,years,qualifiers;
        if ( index != undefined )
        {
            qualifiers = jQuery("select.qualifier:eq("+index+")");
            days = jQuery("select.date_day:eq("+index+")");
            months = jQuery("select.date_month:eq("+index+")");
            years = jQuery("input.year:eq("+index+")");
        }
        else
        {
            qualifiers = jQuery("select.qualifier");
            days = jQuery("select.date_day");
            months = jQuery("select.date_month");
            years = jQuery("input.year");
        }
        // every time someone change a date field we must mark the 
        // pDoc.events entry as 'changed'.
        qualifiers.change( function(e) {
            var all = jQuery("select.qualifier");
            var index = all.index(e.target);
            self.pDoc.events[index].status = "changed";
        });
        days.change( function(e) {
            var all = jQuery("select.date_day");
            var index = all.index(e.target);
            self.pDoc.events[index].status = "changed";
        });
        months.change( function(e) {
            var all = jQuery("select.date_month");
            var index = all.index(e.target);
            self.pDoc.events[index].status = "changed";
        });
        years.change( function(e) {
            var all = jQuery("input.year");
            var index = all.index(e.target);
            self.pDoc.events[index].status = "changed";
        });
    }; 
    /**
     * Post a changed event to the server
     * @param url the url to post to
     * @param service type of change: append this to the url
     * @param obj an ordinary object with name value pairs to upload
     * @return true if it succeeded
     */
    this.post_obj = function( url, service, obj ) {
        console.log("posting to"+url+service+JSON.stringify(obj));
        var jqxhr = jQuery.ajax(url+service,{
            type:"POST",
            data: obj,
            success: function(data, textStatus, jqXHR) {
              //  console.log("success!");
            },
            error:function(jqXHR, textStatus, errorThrown){
                console.log("failed status="+jqXHR.status+" errorThrown="+errorThrown);
            }
        });
        return jqxhr.status<400;
    };
    /**
     * Read the new event data from the specified box
     * @param event the event object to update
     * @param index the index of the box to read from
     */
    this.update_event = function( event, index ) {
        var box = jQuery("div.box:eq("+index+")");
        if ( box != undefined )
        {
            var title = box.find("input.title_box");
            var qualifier = box.find("select.qualier");
            var day = box.find("select.date_day");
            var month = box.find("select.date_month");
            var year = box.find("input.year");
            var type = box.find("select.type_select");
            var editor = box.find("div.tinyeditor");
            if ( editor.length==1 )
                self.restore_div();                
            event.title = title.val();
            event.type = type.val();
            var date = (qualifier.val()!=undefined)?qualifier.val()+" ":"";
            date += (day.val()!=undefined)?day.val():"";
            date += (month.val()!=undefined)?"-"+month.val():"";
            date += (date.length>0)?"-"+year.val():year.val();
            event.date = date;
            var editables = box.find("div.edit-region");
            if ( editables.length==2 )
            {
                event.description = editables[0].innerHTML;
                event.references = editables[1].innerHTML;
            }
        }
        return this.verify_date(index);
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
            self.do_scroll_left(self.boxWidth);
        });
        jQuery("#goright").click( function() {
            self.do_scroll_right(self.boxWidth);
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
            var currScrollPos = jQuery("#wire_frame").scrollLeft();
            var boxIndex = Math.floor(currScrollPos/self.boxWidth);
            var event = self.pDoc.events[boxIndex];
            var new_event = self.create_event(event);
            self.pDoc.events.splice(boxIndex+1,0,new_event);
            var box = jQuery(".box:eq("+boxIndex+")");
            var html = self.create_box(new_event,'added');
            box.after(html);
            // update scroll pane width
            jQuery("#scroll_pane").width(self.boxWidth*self.pDoc.events.length);
            self.do_scroll_right(self.boxWidth);
            // install event handlers
            var newIndex = boxIndex+1;
            self.init_titles(jQuery("input.title_box:eq("+newIndex+")"));
            self.init_type_selects(jQuery("select.type_select:eq("+newIndex+")"));
            self.init_editables(jQuery("div.edit-region:eq("+(newIndex*2)+")"));
            self.init_editables(jQuery("div.edit-region:eq("+(newIndex*2+1)+")"));
            self.init_dates(newIndex);
        });        
        /**
         * Delete an event in the GUI. If added recently just remove it, else 
         * move it to the deleted_events array for later confirmation on server. 
         * It won't be deleted until the user clicks "save".  
         */
        jQuery("#delete_button").click( function() {
            var currScrollPos = jQuery("#wire_frame").scrollLeft();
            var boxIndex = Math.floor(currScrollPos/self.boxWidth);
            var event = self.pDoc.events[boxIndex];
            var deleted_items = self.pDoc.events.splice(boxIndex,1);
            if ( event._id != undefined && deleted_items.length>0 )
            {
                if ( self.deleted_events == undefined )
                    self.deleted_events = deleted_items; 
                else
                    self.deleted_events.push(deleted_items[0]);
            }
            jQuery(".box:eq("+boxIndex+")").remove();
            // update scroll pane width
            jQuery("#scroll_pane").width(self.boxWidth*self.pDoc.events.length);
            self.do_scroll_right(self.boxWidth);
        });        
        /**
         * Save changed, add new and delete old events on server
         */
        jQuery("#save_button").click( function() {
            var url = window.location.protocol+"//"+window.location.host+"/project/events/";
            if ( self.deleted_events != undefined )
            {
                for ( var i=0;i<self.deleted_events.length;i++ )
                {
                    var event = self.deleted_events[i];
                    var obj = {
                        _id: event._id
                    };
                    var res = self.post_obj(url,'delete',obj);
                    if ( !res )
                        console.log("failed to delete "+event._id);
                }
                self.deleted_events = undefined;
            }
            for ( var i=0;i<self.pDoc.events.length;i++ )
            {
                var event = self.pDoc.events[i];
                if ( event.status != 'unchanged' ) {
                    var service = "add";
                    var oldStatus = event.status;
                    if ( event.status == 'changed' )
                        service = 'update';
                    if ( self.update_event(event,i) )
                    {
                        delete event.status;
                        var jsonStr = JSON.stringify(event);
                        var obj = {
                             event: jsonStr
                        };
                        var res = self.post_obj(url,service,obj);
                        if ( !res )
                        {
                            console.log("failed to add or update event");
                            event.status = oldStatus;
                        }
                        else
                            event.status = 'unchanged';
                    }
                    else
                    {
                        var amount = i*self.boxWidth;
                        jQuery("#wire_frame").scrollLeft(amount);
                        alert(self.invalid_date_msg);
                        break;
                    }
                }
            }
        });        
        // one of these for each panel
        this.init_editables(jQuery("div.edit-region"));
        this.init_type_selects(jQuery(".type_select"));
        this.init_titles(jQuery(".title_box"));
        this.init_dates();
        // finally, set the width of the scroll pane
        jQuery("#scroll_pane").width(this.boxWidth*this.pDoc.events.length);
    };
    /**
     * The user clicked on an editable div
     * @param selector the jquery selector for the div - save for later restoration
     */
    this.install_editor = function( selector ) {
        this.selector = selector;
        var target = jQuery(selector);
        target.replaceWith(function(){
            return '<textarea id="tinyeditor">'+target.html()+'</textarea>';
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
        jQuery("div.tinyeditor").replaceWith('<div class="edit-region">'+content+'</div>');
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
     * @param sl_class a class name for the select element (optional)
     */
    this.make_dropdown = function( items, value, sel_class )
    {
        var html = '<select';
        if ( sel_class != undefined )
            html += ' class="'+sel_class+'"';
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
     * @param name the class-name for the box
     */
    this.make_text = function( text, name )
    {
        return '<input type="text" class="'+name+'" value="'+text+'"></input>';
    };
    /**
     * Make a single row in the table containing input elements
     * @param type the type of row content
     * @param value different types of value for the input elements
     * @param classname (optional) class name for text input rows
     */
    this.compose_row = function( type, value, classname )
    {
        var html = "";
        switch ( type )
        {
            case 'text':
                html = '<tr><td colspan="2"><input ';
                if ( classname != undefined )
                    html += 'class="'+classname+'" ';
                html += 'type="text" value="'+value+'"></input></td></tr>';
                break;
            case 'date':
                html += '<tr><td>'+this.make_dropdown(this.qualifiers,(value.qualifier=='none')?'':value.qualifier,'qualifier');
                html += this.make_dropdown(this.month_days,value.day.toString(),'date_day');
                html += this.make_dropdown(this.month_names,(value.month>=0)?this.month_names[value.month+1]:'','date_month');
                html += this.make_text(value.year.toString(),'year');
                html += '</td><td>'+this.make_dropdown(this.event_types,classname,"type_select");
                html += '</td></tr>';
                break;
            case 'textarea':
                html += '<tr><td colspan="2"><div class="edit-region">'+value+'</div></td></tr>';
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
        html += '<div title="'+self.add_event+'" id="add_button" class="event-button"><i class="fa fa-plus-square fa-lg"></i></div>';
        html += '<div title="'+self.delete_event+'" id="delete_button" class="event-button"><i class="fa fa-minus-square fa-lg"></i></div>';
        html += '<div title="'+self.save+'" id="save_button" class="event-button"><i class="fa fa-save fa-lg"></i></div>';
        html += '<input class="filler" type="text"></input>';
        html += '</div><div id="right-toolbar-group">';
        html += '<input id="search_box" type="text">';
        html += '<div title="'+self.search+'" id="search-button" class="event-button"><i class="fa fa-search fa-lg"></i></div>';
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
        html += self.compose_row('text',event.title,'title_box'); 
        html += self.compose_row('date',event.date,event.type);
        html += self.compose_row('textarea',event.description);
        html += self.compose_row('textarea',event.references);
        html += '</table>';
        html += '</div>';
        return html;
    };
    /* Download all the events in compact form for this project */
    jQuery.get( "http://"+window.location.hostname+"/project/events/"+docid, function(data)
    {
        self.pDoc = JSON.parse(data);
        var html = '<div class="events">';
        html += '<div id="left-sidebar"><i id="goleft" class="fa fa-chevron-left fa-3x"></i></div>';
        var events = self.pDoc.events;
        if ( events != undefined )
        {
            html += '<div id="centre_panel">\n';
            html += self.make_toolbar();
            html += '<div id="wire_frame">';
            html += '<div id="scroll_pane">\n';
            for ( var i=0;i<events.length;i++ )
            {
                events[i].status = 'unchanged';
                html += self.create_box(events[i]);
            }
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }
        html += '<div id="right-sidebar"><i id="goright" class="fa fa-chevron-right fa-3x"></i></div>';
        html += "</div>";
        self.setHtml(html);
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
        var params = getArgs('events.js');
        var editor = events(params['target'],params['docid'],params['author']);
    }
); 
