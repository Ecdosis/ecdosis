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
    this.author = author;
    this.save="save";
    this.delete_event="delete event";
    this.add_event="add event";
    this.search="search";
    this.month_days = ['','1','2','3','4','5','6','7','8','9','10','11','12',
        '13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28',
        '29','30','31'];
    this.month_names = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep',
        'Oct','Nov','Dec'];
    this.qualifiers = ['','early','late','by','perhaps','circa'];
    this.event_types = ['biography','composition','letter'];
    var self = this;
    /**
     * Copy the generated html into the document
     * @param the html to append to the target
     */
    this.setHtml = function( html )
    {
        var tgt = jQuery("#"+this.target);
        tgt.append(html);
        jQuery("#goleft").click( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
            var origAmt = jQuery("#centre-panel").scrollLeft();
            var afterAmt = origAmt-600;
            if ( afterAmt < 0 )
                afterAmt = 0;
            else
                afterAmt = ((afterAmt+599)/600)*600;
            jQuery("#centre-panel").scrollLeft(afterAmt-origAmt);
        });
        jQuery("#goright").click( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
            var origAmt = jQuery("#centre-panel").scrollLeft();
            var afterAmt = origAmt+600;
            if ( afterAmt < 0 )
                afterAmt = 0;
            else
                afterAmt = ((afterAmt+599)/600)*600;
            jQuery("#centre-panel").scrollLeft(afterAmt-origAmt);
        });
        jQuery("div.edit-region").click( function(e) {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
            var editables = jQuery("div.edit-region");
            var length = editables.length;
            var index = editables.index( e.target );
            if ( index != undefined )
                self.install_editor("div.edit-region:eq("+index+")");
        });
        jQuery("#search_box").click( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
        });
        jQuery(".type_select").change( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
        });
        jQuery(".title_box").click( function() {
            if ( jQuery("#tinyeditor").length>0 )
                self.restore_div();
        });
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
		    'font', 'size', 'style', '|', 'image', 'hr', 'link', 'unlink', '|', 'print'],
	    footer: true,
	    fonts: ['Verdana','Arial','Georgia','Trebuchet MS'],
	    xhtml: true,
            bodyid: 'editor',
	    footerclass: 'tinyeditor-footer',
	    toggle: {text: 'source', activetext: 'wysiwyg', cssclass: 'toggle'},
	    resize: {cssclass: 'resize'}
        });
    };
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
    this.make_text = function( text, name )
    {
        return '<input type="text" class="'+name+'" value="'+text+'"></input>';
    };
    this.compose_row = function( prompt, type, value, classname )
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
                html += '<tr><td>'+this.make_dropdown(this.qualifiers,(value.qualifier=='none')?'':value.qualifier);
                html += this.make_dropdown(this.month_days,value.day.toString());
                html += this.make_dropdown(this.month_names,(value.month>=0)?this.month_names[value.month+1]:'');
                html += this.make_text(value.year.toString(),'year');
                html += '</td><td>'+this.make_dropdown(this.event_types,value.type,"type_select");
                html += '</td></tr>';
                break;
            case 'textarea':
                html += '<tr><td colspan="2"><div class="edit-region">'+value+'</div></td></tr>';
                break;
        }
        return html;
    };
    this.make_toolbar = function() {
        var  html = '<div id="event_toolbar">';
        html += '<div title="'+self.add_event+'" class="event-button"><i class="fa fa-plus-square fa-lg"></i></div>';
        html += '<div title="'+self.delete_event+'" class="event-button"><i class="fa fa-minus-square fa-lg"></i></div>';
        html += '<div title="'+self.save+'" class="event-button"><i class="fa fa-save fa-lg"></i></div>';
        html += '<input id="search_box" type="text">';
        html += '<div title="'+self.search+'" class="event-button"><i class="fa fa-search fa-lg"></i></div>';
        html += '</div>\n';
        return html;
    };
    /* download all the events in compact form for this project */
    jQuery.get( "http://"+window.location.hostname+"/project/events/"+docid, function(data)
    {
        var html = self.make_toolbar();
        var pDoc = JSON.parse(data);
        html += '<div class="events">';
        html += '<div id="left-sidebar"><i id="goleft" class="fa fa-chevron-left fa-3x"></i></div>';
        var events = pDoc.events;
        if ( events != undefined )
        {
            html += '<div id="centre-panel">\n';
            html += '<div id="scroll-pane">\n';
            for ( var i=0;i<events.length;i++ )
            {
                html += '<div class="box">';
                html += '<table>';
                html += self.compose_row('Title','text',events[i].title,'title_box'); 
                html += self.compose_row('Date','date',events[i].date);
                html += self.compose_row('Description','textarea',events[i].description);
                html += self.compose_row('References','textarea',events[i].references);
                html += '<input type="hidden" class="_id" value="'+events[i]._id+'"></input>';
                html += '<input type="hidden" class="status" value="unchanged"></input>';
                html += '</table>';
                html += '</div>';
            }
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
jQuery(document).ready( 
    function(){
        var params = getArgs('events.js');
        var editor = events(params['target'],params['docid'],params['author']);
    }
); 
