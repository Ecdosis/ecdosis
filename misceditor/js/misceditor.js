function misceditor( target, udata )
{
    var self = this;
    this.target = target;
    this.key = "I tell a settlers tale of the old times";
    // save a copy of the old userdata for later verification
    this.encrypted = udata;
    // hash of temporarily saved versions not sent to server
    this.saved = {};
    // hash of saved states;
    this.status = {};
    // status of current doc
    this.currStatus = "saved";
    // flag to save reloading the preview
    this.previewValid = false;
    /**
     * Decode an encrypted userdata string using the key.
     */
    this.decode = function( enc ) {
        var plain = atob(enc);
        var sb = "";
        for ( var i=0;i<plain.length;i++ )
        {
            var kchar = this.key.charCodeAt(i%this.key.length);
            var pchr = plain.charCodeAt(i)^kchar;
            sb += String.fromCharCode(pchr);
        }
        return sb;
    };
    var decoded = this.decode(udata);
    this.userdata = JSON.parse(decoded);
    /**
     * Is the currently logged-in user an editor
     * @return true if the user is logged in and has a role "editor"
     */
    this.isEditor = function() {
        if ( this.userdata.name.length > 0 && this.userdata.roles.length > 0 )
        {
            for ( var i=0;i<this.userdata.roles.length;i++ )
            if ( this.userdata.roles[i] == "editor" )
                return true;
        }
        return false;
    };
    /**
     * Remove escaped slashes from jSON
     * @return the JSON with unescaped slashes
     */
    this.strip = function( str )
    {
        var rep = str.replace(/\\\//g,"/");
        return rep;
    };
    /** 
     * Set the status icon
     */
    this.updateStatus = function() {
         var st = jQuery("#status i");
         if ( st.hasClass("fa-check") )
             st.removeClass("fa-check");
         if ( st.hasClass("fa-times") )
             st.removeClass("fa-times");
         if ( st.hasClass("fa-exclamation-triangle") )
             st.removeClass("exclamation-triangle");
         if ( this.currStatus == "saved" )
             st.addClass("fa-check");
         else if ( this.currStatus == "unsaved" )
             st.addClass("fa-times");
         else if ( this.currStatus == "error")
             st.addClass("fa-exclamation-triangle");
    };
    /**
     * Build the HTML preview
     * @param hide true if we hide it once loaded
     */
    this.rebuildPreview = function(hide) {
        if ( !this.previewValid )
        {
            jQuery.get("/misc/html?docid="+jQuery("#docid").val(),
            function(data){
                var pv = jQuery("#preview");
                var txt = jQuery("#text");
                pv.empty();
                pv.append(data);
                pv.width(txt.width()-2);
                pv.height(txt.height()-2);
                pv.css("border-width","1px");
                pv.css("padding","3px");
                if ( hide )
                   pv.hide();
                else
                   pv.show();
                self.previewValid = true;
            });
        }
    };
    /**
     * Force the text to be visible, hide the preview and uncheck the preview 
     */
    this.forceTextToShow = function() {
        jQuery("#preview").hide();
        jQuery("#text").show();
        jQuery("#preview_check").attr('checked', false);
    };
    /**
     * Load a single document
     * @param docid the document identifier
     */
    this.loadDocument = function( docid )
    {
        var oldDocid = jQuery("#docid").val();
        if ( oldDocid != undefined && oldDocid.length>0 && oldDocid != docid )
        {
            this.saved[oldDocid] = jQuery("#text").val();
            this.status[oldDocid] = this.currStatus;
            console.log("auto-saving "+oldDocid);
        }
        if ( this.saved[docid] != undefined && this.saved[docid].length>0 )
        {
            jQuery("#text").val(this.saved[docid]);
            jQuery("#text").text(this.saved[docid]);
            this.currStatus = this.status[docid];
            this.rebuildDocid();
            this.updateStatus();
            this.previewValid = false;
            this.forceTextToShow();
            this.rebuildPreview(true);
            jQuery("#delete").val("false");
        }
        else
        {
            jQuery.get("/misc/?docid="+docid,function(data) {
                jQuery("#text").text(data);
                jQuery("#text").val(data);
                self.saved[docid] = data;
                self.currStatus = "saved";
                //console.log("currStatus ="+self.currStatus);
                self.rebuildDocid();
                self.updateStatus();
                self.previewValid = false;
                self.forceTextToShow();
                self.rebuildPreview(true);
                // make sure we don't delete it on save!
                jQuery("#delete").val("false");
            });
        }
    };
    /**
     * Load the docids of all the documents in this category
     * @param optDocid optional docid
     */
    this.loadDocuments = function(optDocid)
    {
        var docid = jQuery("#project").val()+"/"+jQuery("#category").val();
        jQuery.get("/misc/documents?docid="+docid+"&format=text/x-markdown",function(data) {
            var files = jQuery("#files");
            files.empty();
            jQuery("#text").val("");
            for ( var i=0;i<data.length;i++ )
            {
                files.append('<option value="'
                    +data[i].docid+'">'+data[i].title+'</option>\n');
            }
            if ( data.length>0 )
            {
                if ( optDocid == null || optDocid == undefined )
                    self.loadDocument(data[0].docid);
                else
                {
                    self.loadDocument(optDocid);
                    jQuery("#files").val( optDocid );
                }
            }
        });
    };
    /**
     * Get the list of categories for this project
     */
    this.loadCategoryList = function()
    {
        jQuery.get("/misc/categories?docid="+jQuery("#project").val(),function(data) {
            var categories = jQuery("#category");
            categories.empty();
            for ( var i=0;i<data.length;i++ )
            {
                categories.append('<option value="'
                    +self.strip(data[i])+'">'+self.strip(data[i])+'</option>\n');
            }
            categories.append('<option value="add">Add new...</option>\n');
            self.loadDocuments(null,null);
        });
    }
    /**
     * Get the list of available projects
     */
    this.loadProjectList = function()
    {
        jQuery.get("/project/list",function(data) {
            var projects = jQuery("#project");
            projects.empty();
            for ( var i=0;i<data.length;i++ )
            {
                projects.append('<option value="'
                    +self.strip(data[i].docid)+'">'+data[i].work+'</option>\n');
            }
            self.loadCategoryList();
        });
    }
    /**
     * Turn a title into the last part of a docid
     * @return the cleaned title
     */
    this.cleanTitle = function( title )
    {
        title = title.replace(/ /g,"-");
        title = title.toLowerCase();
        return title.replace(/[,.;:!\[\]{}']/g,"");
    }
    /**
     * Rebuild the docid based on current selections of category etc
     */
    this.rebuildDocid = function()
    {
        // normalise title
        var title = this.cleanTitle(jQuery("#files option:selected").text());
        var newValue = jQuery("#project").val()+"/"
            +jQuery("#category").val()+"/"+title;
        newValue = newValue.replace(/\/\//g,"/");
        jQuery("#docid").val(newValue);
    }
    /**
     * Does the files list already contain a title?
     * @param selectid the id of the select
     * @param value the value to test for
     * @return true if it is already present
     */
    this.selectContains = function( selectid, value )
    {
        var found = false;
        jQuery("#"+selectid+" option").each(function(i) {
            var optText = jQuery(this).text();
            if ( optText == value )
                found = true;
        });
        return found;
    }
    /**
     * Use the result of a POST operation to set the saved status
     */
    this.parseResponse = function(resp) {
        var scPos = resp.indexOf(";");
        if ( scPos != -1 )
        {
             var status = resp.substring(0,scPos);
             if ( status.indexOf("Status")!= -1 )
             {
                 var statusCode = status.substring(7);
                 var code = parseInt(statusCode);
                 if ( code == 200 )
                     this.currStatus = "saved";
                 else if ( code >= 400 )
                     this.currStatus = "error";
                 this.updateStatus();
             }
        }
    };
    /**
     * Get the docid and title of the previous document
     */
    this.loadLastDocument = function() {
        var docid = jQuery("#docid").val();
        jQuery.get("/misc/previous?docid="+docid,function(data){
            jQuery("#docid").val("");
            // now set the category and file name
            var parts = data.docid.split("/");
            if ( parts.length > 1 )
            {
                var category = parts[parts.length-2];
                jQuery("#category").val(category);
                self.loadDocuments(data.docid,data.title);
            }
        });
    };
    /**
     * Make human-readable title from title in docid
     */
    this.makeTitle = function( rawTitle ) {
        var parts = rawTitle.split("/");
        if ( parts.length> 0 )
        {
            var state;
            var title = parts[parts.length-1].replace(/-/," ");
            for ( var i=0;i<title.length;i++ )
            {
                 switch ( state )
                 {
                     case 0:
                          if ( title[i] == ' ' )
                              state = 1;
                          break;
                     case 1:
                          if ( title[i] != ' ' )
                          {
                              title[i] = title[i].toUpperCase();
                              state = 0;
                          }
                          break;
                 }
            }
            return title;
        }
        else
            return rawTitle;
    };
    /**
     * Get the user to specify a new document
     */
    this.newDocument = function() {
        var title = prompt("Title", "Untitled");
        while ( this.selectContains("files",title) )
            title = prompt("That title is already taken. Please choose another.", title);
        var newDocid = jQuery("#project").val()+"/"
            +jQuery("#category").val()+"/"+self.cleanTitle(title);
        newDocid = newDocid.replace(/\/\//g,"/");
        jQuery("#files").append('<option value="'
                +newDocid+'">'+title+'</option>\n');
        jQuery("#text").val('');
        jQuery("#text").text('');
        jQuery("#files").val(newDocid);
        this.previewValid = false;
        this.rebuildDocid();
    };
    /**
     * Retrieve the old category from the docid as the current one is wrong
     * @return the last category name
     */
    this.getCategoryFromDocid = function() {
        var docid = jQuery("#docid").val();
        var parts = docid.split("/");
        if ( parts.length > 1 )
            return parts[parts.length-2];
        else
            return null;
    };
    /**
     * Set up handlers for the various buttons aend input fields
     */
    this.initEventHandlers = function() {
        // set up event handlers for each input control
        jQuery("#category").change(function(){
            if ( jQuery(this).val() == "add" )
            {
                var category = prompt("Category", "Untitled");
                while ( self.selectContains("category",category) )
                    category = prompt("That category is already taken. "
                    +"Please choose another.", category);
                if ( category != null && category != undefined && category.length > 0 )
                {
                    category = category.replace(/ /g,"_").toLowerCase();
                    jQuery('<option value="'+category+'">'
                        +category+'</option>\n').insertBefore('#category option[value="add"]');
                    jQuery("#category").val(category);
                    jQuery("#files").empty();
                    jQuery("#text").val("");
                    jQuery("#preview").empty();
                }
                else
                {
                    category = self.getCategoryFromDocid();
                    if ( category != null )
                        jQuery("#category").val(category);
                }
            }
            else
                self.loadDocuments(null,null);
        });
        jQuery("#files").change(function(){
            var value = jQuery(this).val();
            var text = jQuery("#files option[value='"+value+"']").text();
            self.loadDocument(value,text);
        });
        jQuery("#project").change(function() {
            self.rebuildDocid();
            self.loadProjectList();
        });
        jQuery("#new").click(function() {
            self.newDocument();
        });
        jQuery("#save").click(function(){
            self.saved[jQuery("#docid").val()] = undefined;
        });
        jQuery("#delete_button").click(function() {
            var yes = confirm("Are you sure you want to permanently delete "
                +self.makeTitle(jQuery("#files").val())+"");
            if ( yes )
            {
                jQuery("#userdata").val(self.encrypted);
                jQuery("#delete").val("true");
            }
        });
        jQuery(document).submit( function(e) {
            var f = jQuery("#postform");
            jQuery("#userdata").val(self.encrypted);
            var jqxhr = jQuery.ajax({
	            url: f.attr('action'),
	            type: f.attr('method'),
	            data: f.serialize(),
	            success: function(html) {
	                self.parseResponse(html);
                    if ( jQuery("#delete").val()=="true" )
                    {
                        jQuery("#files option:selected").remove();
                        var docid = jQuery("#docid").val();
                        if ( docid in self.saved )
                            delete self.saved[docid];
                        if ( docid in self.status )
                            delete self.status[docid];
                        self.loadLastDocument();
                    }
 	            },
                error:function(jqXHR, textStatus, errorThrown){
                    console.log("Error: "+jqXHR.textResponse);
                    console.log(textStatus);
                    console.log(errorThrown);
                }
            });
           e.preventDefault();
        });
        jQuery("#text").keypress(function(){
            if ( self.currStatus == "saved" )
            {
                self.currStatus = "unsaved";
                self.previewValid = false;
                self.updateStatus();
            }
        });
        jQuery("#preview_check").change(function(){
            if ( jQuery(this).is(":checked") )
            {
                self.rebuildPreview(false);
                jQuery("#text").hide();
                jQuery("#preview").show();
            }
            else
            { 
                jQuery("#preview").hide();
                jQuery("#text").show();
            }
        });
    };
    /**
     * Build the HTML of this form and append it to the target div
     */
    this.buildHtml = function() {
        if ( this.isEditor() )
        {
            var html = '<form id="postform" method="POST" accept-charset="UTF-8" action="/misc/">';
            html += '<table id="toolmenu"><tr><td><span class="prompt">Project:</span>';
            html += '<select id="project"></select>';
            html += '<span class="prompt">Category:</span>';
            html += '<select id="category"></select>';
            html += '<span class="prompt">File:</span>';
            html += '<select id="files"></select></td></tr>';
            html += '<tr><td><input id="new" type="button"Value="New"></input>';
            html += '<input type="submit" id="delete_button" value="Delete"></input>';
            html += '<input type="submit" id="save" value="Save"></input>';
            html += '<span id="status"><i class="fa fa-lg fa-check"></i></span>';
            html += '<input type="checkbox" id="preview_check"></input>';
            html += '<span class="right_prompt">Preview:</span>';
            html += '</td></tr></table>';
            html += '<div id="wrapper">';
            html += '<textarea name="text" rows="30" cols="50" id="text"></textarea>';
            html += '<div id="preview"></div>';
            html += '</div>';
            html += '<input type="hidden" id="docid" name="docid"></input>';
            html += '<input type="hidden" name="format" value="text/x-markdown"></input>';
            html += '<input type="hidden" id="delete" name="delete"></input>';
            html += '<input type="hidden" id="userdata" name="userdata"></input>';
            html += '</form>\n';
            jQuery("#"+this.target).empty();
            jQuery("#"+this.target).append(html);
            this.initEventHandlers();
            jQuery("#"+this.target).css("visibility","visible");
            // kick off the project list building etc
            this.loadProjectList();
        }
        else
        {
            var html = '<p class="error">You are not logged in</p>';
            jQuery("#"+this.target).empty();
            jQuery("#"+this.target).append(html);
            jQuery("#"+this.target).css("visibility","visible");
        }
    };
    // set the ball rolling
    this.buildHtml();
}
/**
 * Needed to invoke the module with args
 */
function get_one_param( params, name )
{
    var parts = params.split("&");
    for ( var i=0;i<parts.length;i++ )
    {
        var halves = parts[i].split("=");
        if ( halves.length==2 && halves[0]==name )
            return halves[1];
    }
    return "";
}
/**
 * This reads the "arguments" to the javascript file
 * @param scrName the name of the script file minus ".js"
 */
function getMiscEditorArgs( scrName )
{
    var params = new Object ();
    var module_params = jQuery("#misceditor_params").val();
    if ( module_params != undefined && module_params.length>0 )
    {
        var parts = module_params.split("&");
        for ( var i=0;i<parts.length;i++ )
        {
            var halves = parts[i].split("=");
            if ( halves.length==2 )
                params[halves[0]] = halves[1];
        }
    }
    else
    {
        var scripts = jQuery("script");
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
                        var index = pairs[i].indexOf("=");
                        if ( index != -1 )
                        {
                            var keyVal = pairs[i].substring(0,index);
                            var key = unescape( keyVal );
                            var value = pairs[i].substring(index+1);
                            var val = unescape( value );
                            val = val.replace(/\+/g, ' ');
                            params[key] = val;
                        }
                    }
                }
            }
            return params;
        });
    }
    return params;
}
jQuery(document).ready(function(){
    var params = getMiscEditorArgs('misceditor');
    jQuery("#"+params['mod-target']).css("visibility","hidden");
    var me = new misceditor(params['target'],params['udata']);
});

