/**
 * Convert an array of docids to a nested HTML select element
 * @param docids an array of docids
 * @param name the name of the select list
 * @param id the id of the select
 */
function nested_select( docids, name, id ) {
    this.load = function( docids ) {
        var top = new Array();
        for ( var i=0;i<docids.length;i++ )
        {
            var parts = docids[i].split("/");
            this.place_key(top,parts);
        }
        // so now top is a nested hash of options
        this.html += this.build_options( top );
    };
    /**
     * Place a key in a nested array recursively
     * @param array an array of keys, perhaps empty
     * @param parts an array of parts, perhaps empty
     */
    this.place_key = function(array,parts) {
        if ( parts.length > 0 )
        {
            if ( array[parts[0]] == undefined )
            {
                array[parts[0]] = new Array();
                this.place_key(array[parts[0]],parts.slice(1));
            }
        }
    };
    /**
     * Build the actual select element
     * @param array the top-level associative array
     */
    this.build_options = function(array) {
        var html = "";
        for ( var key in array )
        {
            var count = 0;
            for ( var i in array[key] )
                count++;
            if ( count == 0 )
                html += '<option value="'+key+'">'+key+'</option>';
            else
                html += '<optgroup label="'+key+'">'
                    +this.build_options(array[key])+'</optgroup>';
        }
        return html;
    };
    this.html = '<select id="'+id+'" name="'+name+'">';
    this.load( docids );
    this.html += '</select>';
}
/**
 * Create an upload dialog
 * @param target the id of the target element on the page
 * @param demo if "true" don't let the user upload
 * @param language 2-letter ISO code e.g. en or it
 * @param mod_path the path to the module
 */
function uploader( target, demo, language, mod_path ) {
    var self = this;
    /**
     * Check that there is at least one file for upload
     * @return true if it is OK else false and alert the user
     */
    this.check_files = function() {
        var trs = jQuery("#listing tr");
        if ( trs.length == 0 )
        {
            alert( this.strs.missing_files );
            return false;
        }
        else
            return true;
    };
    /**jQuery(this)
     * Verify that the field is not empty or just spaces
     * @param item the jQuery object representing a form field
     */
    this.fverify = function( item ) { 
        var name = "";
        if ( item != undefined )
        {
            name = item.attr("id");
            if ( item.val() != undefined && item.val().length>0 )
            {
                var copy = item.val();
                copy.replace(/\s+/g,"");
                if ( copy.length>0 )
                    return true;
            }
        }
        else
            name = "required fields";
        alert(name+" may not be empty");
        return false;
    };
    /** 
     * Check that the form is complete and ready for upload
     * NB this is a function not a method
     * @param event the submit event
     */
    this.check_form = function( event ) {
        var project = jQuery("#PROJECT");
        var section = jQuery("#SECTION");
        var subsection = jQuery("#SUBSECTION");
        if ( self.check_files()&&self.fverify(project) )
        {
            var docid = project.val();
            if ( section.val().length > 0 )
            {
                docid += "/"+section.val();
                if ( subsection.value.val()>0 )
                    docid += "/"+subsection.val();
            }
            var hidden = jQuery("#docid");
            hidden.val(docid);
            var demo = jQuery("#demo");
            if ( demo != undefined )
            {
                var password = prompt("Password","");
                demo.val(password);
            }
        }
        else
            event.preventDefault();
    };
    /**
     * Remove a file from the list
     * @param event the event that caused it to be called
     */
    this.remove = function( event ) {
        var repo = jQuery("#repository");
        var child = jQuery(event.target).parent().prev().text();
        repo.children().each( function() {
            var value = jQuery(this).val();
            if ( this.nodeName=="INPUT"&& child==value )
            {
                jQuery(this).remove();
            }
        });
        jQuery("#listing tr").each( function() {
            if ( jQuery(this).text()==child )
                 jQuery(this).remove();
        });
    };
    /**
     * Find out if a file has already been specified
     * @param path the path to the file
     */
    this.already_selected = function( path ) {
        var result = false;
        var children = jQuery("#listing tr");
        children.each( function() {
            if ( jQuery(this).text()==path )
                result = true;
        });
        return result;
    };
    /**
     * Clear a file input field by replacing it with an empty one
     * @param input1 the old jQuery input field object
     */
    this.clear_file_input = function( input1 ) {
        var parent = input1.parent();
        input1.detach();
        jQuery('<input id="input1"></input>').insertBefore(parent.children().first());
        var input2 = jQuery("#input1");
        input1.attr( "class", "invisible" );
	input1.removeAttr("id");
        input2.attr("type","file");
        input2.attr("name","uploadedfile[]");
        input2.change( self.do_add_file );
    };
    /**
     * Add a file to the upload set. Becasue this is an event-handler, 
     * "this" is the DOM element
     */
    this.do_add_file = function() {
        var repo = jQuery("#repository");
        var listing = jQuery("#listing");
        if ( !self.already_selected(this.value) )
        {
            var input1 = jQuery("#input1");
            self.clear_file_input( input1 );
            repo.append( input1[0] );
            // now create the row in the listing table
            var html = '<tr><td><span>';
            html += input1.val();
            html += '</span></td><td><input type="button" class="remove" value="remove"';
            var value = input1.val().replace(/\\/g,"\\\\");
            html += ' data-file="'+value+'"></input></td></tr>';
            listing.append( html );
            var last = jQuery(".remove").last();
            last.click(self.remove);
        }
        else
        {
            self.clear_file_input( jQuery("#input1") );
            alert("You have already chosen that file!");
        }
    };
    /**
     * Not sure what this does yet
     */
    this.update_group = function() {
        var corform = jQuery("#CORFORM");
        var groupSpan = jQuery("#GROUP");
        if ( groupSpan != undefined )
        {
            var path = corform[0].options[corform[0].selectedIndex].value;
            var parts = path.split("/");
            var group = "";
            for ( var i=0;i<parts.length-1;i++ )
            {
                if ( group.length > 0 )
                    group += "-";
                group += parts[i];
            }
            if ( group.length > 0 )
                group += ": ";
            groupSpan.text(group);
        }
    };
    /**
     * Actually create the form from its HTML
     * @param html the generated html of the form
     */
    this.set_html = function( html ) {
        var tgt = jQuery("#"+target);
        tgt.children().remove();
        tgt.append(html);
        jQuery(".remove").click( function(event) {
            var file = jQuery(event.target).attr("data-file");
            self.remove( file );
        });
        jQuery("#input1").change( this.do_add_file );
        jQuery('form[name="default"]').submit(this.check_form);
    };
    /**
     * Make the hidden demo tag to stop uploading
     */
    this.make_demo_tag = function() {
        var demo = '<input';
        demo += ' type="hidden"';
        demo += ' name="demo"';
        demo += ' id="demo"';
        demo += '></input>\n';
        return demo;
    };
    /**
     * Make an empty docid hidden element
     */
    this.make_docid = function() {
        var docid = '<input';
        docid += ' type="hidden"';
        docid += ' name="docid"';
        docid += ' id="docid"';
        docid += '></input>\n';
        return docid;
    };
    /**
     * Make the header before all the input fields
     */
    this.make_header = function() {
        var div = '<div class="header">\n';
        div += '<p>'+self.strs.subtitle+'</p>';
        div += '</div>';
        return div;
    };
    /**
     * Make the right-hand side of the form
     */
    this.make_upload_box = function()
    {
        var upload = '<div class="upload">';
        upload += this.strs.upload_prompt+': ';
        var input1 = '<input';
        input1 += ' type="file"';
        input1 += ' name="file"';
        input1 += ' id="input1"';
        input1 += ' title="'+this.strs.browse_tip+'"></input>';
        upload += input1;
        var table = '<table id="listing"></table>';
        upload += table;
        var repo = '<div id="repository"></div>';
        upload += repo;
        var input2 = "<input";
        input2 += ' type="submit"';
        input2 += ' value="Upload files"';
        input2 += ' title="'+this.strs.upload_tip+'"></input>';
        upload += input2;
        upload += '</div>';
        return upload;
    }
    /**
     * Make a dropdown menu of CorForms available on server
     * @return a select dropdown (possibly empty if it failed)
     */
    this.make_corform_dropdown = function() {
        var html = '<select name="STYLE" id="STYLE"></select>';
        var url = "http://"+window.location.hostname
             +"/calliope/collection?collection=corform";
        jQuery.get( url, function(data) 
        {    
            var items = data;
            console.log("loaded corform lists");
            if ( items != undefined && items.length > 0 )
            {
                var sel = new nested_select( items, "STYLE", "STYLE" );
                jQuery("#STYLE").replaceWith(sel.html);
            }
        })
        .fail(function() {
            console.log("failed to load corform lists");
            alert(self.strs.corform_error);
        });
        return html;
    };
    /**
     * Make a dropdown list of available aspell dictionaries
     * @return a html select element as a string
     */
    this.make_dictionary_dropdown = function() {
        var html = '<select name="dict" id="dict"></select>';
        var url = "http://"+window.location.hostname
              +"/calliope/json/dicts";
        jQuery.get( url, function(data) 
        {   
            console.log("loaded dictionary lists");
            var dicts = data;
            if ( dicts != undefined )
            {
                var list = new Array();
                for ( var i=0;i<dicts.length;i++ )
                {
                    list.push( dicts[i].code );
                }
                var sel = new nested_select( list, "dict", "dict" );
                jQuery("#dict").replaceWith(sel.html);
            }
        })
        .fail(function() {
            console.log("failed to load dictionary list");
            alert(self.strs.dicts_error);
        });
        // default to empty list
        return html;
    };
    /**
     * Make a new row to record the work name
     * @return HTML for a table row in the "fields" div
     */
    this.make_work_row = function() {
        var row = '<tr>';
        var cell1 = '<td>';
        cell1 += "Work: ";
        cell1 += '</td>';
        row += cell1;
        var cell2 = '<td';
        var work = '<input';
        work += ' type="text"';
        work += ' id="WORK"';
        work += '></input>';
        cell2 += ' title="'+this.strs.work_tip+'">';
        cell2 += work;
        cell2 += '</td>';
        row += cell2;
        row += '</tr>\n';
        return row;
    };
    /**
     * Make a dropdown list of available projects
     * @return a html select element as a string
     */
    this.make_project_dropdown = function() {
        var html = '<select id="PROJECT"></select>';
        var url = "http://"+window.location.hostname+"/project/list";
        jQuery.get( url, function(data) 
        {   
            var projects = data;
            if ( projects != undefined )
            {
                html = '<select name="PROJECT" id="PROJECT">';
                for ( var i=0;i<projects.length;i++ )
                {
                    html += '<option value="'+projects[i].docid
                    +'">'+projects[i].author+": "+projects[i].work
                    +'</option>\n';
                }
                html += '</select>';
                jQuery("#PROJECT").replaceWith(html);
                jQuery("#PROJECT").change(function(){
                    var docid = jQuery(this).val();
                    var parts = docid.split("/");
                    if ( parts.length==2 )
                    {
                        var section = jQuery("#SECTION").closest("tr");
                        var children = section.parent().children();
                        var index = children.index(section);
                        if ( index==1 )
                            section.before(self.make_work_row());
                    }
                    else if ( parts.length==3 )
                    {
                        var work = jQuery("#WORK").closest("tr");
                        if ( work != undefined )
                            work.remove();
                    }
                });   
            }
        })
        .fail(function() {
            console.log("failed to load project list");
            alert(self.strs.dicts_error);
        });
        // default to empty list
        return html;
    };
    /**
     * Make all the input fields and the filter dropdown.
     * @return an enclosing div Element
     */
    this.make_text_fields = function() {
        // first row
        var div = '<div class="fields">';
        var table = '<table class="fields">';
        var row1 = '<tr>';
        var cell1 = '<td>';
        cell1 += "Project: ";
        cell1 += '</td>';
        row1 += cell1;
        var cell2 = '<td';
        cell2 += ' title="'+this.strs.project_tip+'">';
        cell2 += this.make_project_dropdown();
        cell2 += '</td>';
        row1 += cell2;
        row1 += '</tr>\n';
        table += row1;

        // row 4
        var row4 = '<tr>';
        var cell7 = '<td>';
        cell7 += "Section: ";
        cell7 += '</td>';
        row4 += cell7;
        var cell8 = '<td';
        var section = '<input';
        section += ' type="text"';
        section += ' id="SECTION"';
        section += '></input>';
        cell8 += ' title="'+this.strs.section_tip+'">';
        cell8 += section;
        cell8 += '</td>';
        row4 += cell8;
        row4 += '</tr>\n';
        table += row4;
        
        // row 5
        var row5 = '<tr>';
        var cell9 = '<td>';
        cell9 += "Subsection: ";
        cell9 += '</td>';
        row5 += cell9;
        var cell10 = '<td';
        cell10 += ' title="'+this.strs.subsection_tip+'">';
        var subsection = '<input';
        subsection += ' type="text"';
        subsection += ' id="SUBSECTION"';
        subsection += '></input>';
        cell10 += subsection;
        row5 += cell10;
        row5 += '</td>';
        row5 += '</tr>\n';
        table += row5;
        
        // row 6
        var row6 = '<tr>';
        var cell11 = '<td>';
        cell11 += "Filter: ";
        cell11 += '</td>';
        row6 += cell11;
        var filters = '<select';
        filters += ' name="FILTER">';
        var option1 = '<option';
        option1 += ' value="Empty">';
        option1 += "Empty";
        option1 += '</option>';
        filters += option1;
        var option2 = '<option';
        option2 += ' value="CCE">';
        option2 += "CCE";
        option2 += '</option>';
        filters += option2;
        var option3 = '<option';
        option3 += ' value="Poem">';
        option3 += "Poem";
        option3 += '</option>';
        filters += option3;
        var option4 = '<option';
        option4 += ' value="Play">';
        option4 += "Play";
        option4 += '</option>';
        filters += option4;
        var option5 = '<option';
        option5 += ' value="Novel">';
        option5 += "Novel";
        option5 += '</option>';
        filters += option5;
        filters += '</select>';
        var cell12 = '<td';
        cell12 += ' title="'+this.strs.filter_tip+'">';
        cell12 += filters;
        cell12 += '</td>';
        row6 += cell12;
        row6 += '</tr>\n';
        table += row6;
        
        var row7 ='<tr>';
        var cell13 = '<td';
        cell13 += ' title="'+this.strs.style_tip+'">';
        cell13 += "Style: ";
        cell13 += '</td>';
        row7 += cell13;
        var cell14 = '<td';
        cell14 += ' title="'+this.strs.style_tip+'">';
        var group4 = '<span id="GROUP"></span>';
        cell14 += group4;
        cell14 += this.make_corform_dropdown();
        cell14 += '</td>';
        row7 += cell14;
        row7 += '</tr>\n';
        table += row7;
        
        var row8 = '<tr>';
        var cell15 = '<td';
        cell15 += ' title="'+this.strs.length_tip+'">';
        cell15 += "Check length: ";
        cell15 += '</td>';
        row8 += cell15;
        var cell16 = '<td title"'+this.strs.length_tip+'">';
        var checkbox = '<input';
        checkbox += ' name="SIMILARITY"';
        checkbox += ' type="checkbox"';
        checkbox += ' value="1"';
        checkbox += ' checked="checked"';
        checkbox += '></input>';
        cell16 += checkbox;
        cell16 += '</td>';
        row8 += cell16;
        row8 += '</tr>\n';
        table += row8;
        
        var row9 = '<tr>';
        var cell17 = '<td>';
        cell17 += "Language: ";
        cell17 += '</td>';
        row9 += cell17;
        var cell18 = '<td';
        cell18 += ' title="'+this.strs.lang_tip+'">';
        cell18 += this.make_dictionary_dropdown();
        cell18 += '</td>';
        row9 += cell18;
        row9 += '</tr>\n';
        table += row9;
        table += '</table>';
        div += table;
        div += '</div>';
        return div;
    };
    /* define all language-related strings for later */
    var script_name = window.location.pathname;
    var lastIndex = script_name.lastIndexOf("/");
    if ( lastIndex !=-1 )
       script_name = script_name.substr(0,lastIndex);
    script_name += '/'+mod_path+'/js/strings.'+language+'.js';
    jQuery.getScript(script_name)
    .done(function( script, textStatus ) {
        self.strs = load_strings();
        console.log("loaded "+script_name+" successfully");
        // build form
        var action = "http://"+window.location.hostname+"/calliope/import/mixed";
        var html = '<form name="default" method="POST" action="'+action+'" target="log"';
        html += ' enctype="multipart/form-data">\n';
        html += '<div class="wrapper">';
        html += self.make_header();
        html += self.make_text_fields();
        html += self.make_upload_box();
        html += self.make_docid();
        if ( demo == 'true' )
            html += self.make_demo_tag();
        html += '<iframe name="log" class="log"></iframe>';
        html += '</div></form>';
        self.set_html( html );
        jQuery('form[name="default"]').submit(this.checkform);
    })
    .fail(function( jqxhr, settings, exception ) {
        console.log("Failed to load language strings. status=",jqxhr.status );
    });
}
/**
 * This reads the "arguments" to the javascript file
 * @param scrName the name of the script file minus ".js"
 * @return a key-value map of the parameters
 */
function get_args( scrName )
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
/**
 * Load the importer dialog with two arguments
 */
jQuery(document).ready(
    function(){
        var params = get_args('uploader');
        new uploader(params['target'],params['demo'],
            params['language'],params['modpath']);
    }
);

