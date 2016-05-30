function misceditor( target, udata )
{
    var self = this;
    this.target = target;
    this.key = "I tell a settlers tale of the old times";
    // save a copy of the old userdata for later verification
    this.encrypted = udata;
    // hash of temporarily saved versions not sent to server
    this.saved = {};
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
    console.log(decoded);
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
     * Load a single document
     * @param docid the document identifier
     * @param title the title of it
     */
    this.loadDocument = function( docid, title )
    {
        var oldDocid = jQuery("#docid").val();
        if ( oldDocid != undefined && oldDocid.length>0 && oldDocid != docid )
        {
            this.saved[oldDocid] = jQuery("#text").val();
            console.log("auto-saving "+oldDocid);
        }
        if ( this.saved[docid] != undefined && this.saved[docid].length>0 )
        {
            jQuery("#text").val(this.saved[docid]);
            jQuery("#text").text(this.saved[docid]);
            jQuery("#title").val(title);
            this.rebuildDocid();
        }
        else
        {
            jQuery.get("/misc/?docid="+docid,function(data) {
            jQuery("#title").val(title);
            jQuery("#text").text(data);
            jQuery("#text").val(data);
            self.saved[docid] = data;
            self.rebuildDocid();
        });
        }
        // make sure we don't delete it on save!
        jQuery("#delete").val("");
    };
    /**
     * Load the titles and docids of all the documents in this category
     */
    this.loadDocuments = function()
    {
        var docid = jQuery("#project").val()+"/"+jQuery("#category").val();
        jQuery.get("/misc/documents?docid="+docid+"&format=text/x-markdown",function(data) {
            var files = jQuery("#files");
            files.empty();
            for ( var i=0;i<data.length;i++ )
            {
                files.append('<option value="'
                    +data[i].docid+'">'+data[i].title+'</option>\n');
            }
            if ( data.length>0 )
            {
                self.loadDocument(data[0].docid,data[0].title);
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
            self.loadDocuments();
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
        var title = this.cleanTitle(jQuery("#title").val());
        var newValue = jQuery("#project").val()+"/"
            +jQuery("#category").val()+"/"+title;
        newValue = newValue.replace(/\/\//g,"/");
        jQuery("#docid").val(newValue);
    }
    /**
     * Does the files list already contain a title?
     * @param title the title to test for
     * @return true if it is already present
     */
    this.filesContain = function( title )
    {
        var found = false;
        jQuery("#files option").each(function(i) {
        var optTitle = jQuery(this).text();
        if ( optTitle == title )
            found = true;
        });
        return found;
    }
    this.initEventHandlers = function() {
        // set up event handlers for each input control
        jQuery("#category").change(function(){
            self.loadDocuments();
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
        jQuery("#source").val(window.location.href);
        jQuery("#new").click(function() {
            var title = prompt("Title", "Untitled");
            while ( self.filesContain(title) )
                title = prompt("That title is already taken. Please choose another.", title);
            var newDocid = jQuery("#project").val()+"/"
                +jQuery("#category").val()+"/"+cleanTitle(title);
            newDocid = newDocid.replace(/\/\//g,"/");
            jQuery("#files").append('<option value="'
                    +newDocid+'">'+title+'</option>\n');
            jQuery("#text").val('');
            jQuery("#text").text('');
            jQuery("#title").val(title);
            jQuery("#files").val(newDocid);
            self.rebuildDocid();
        });
        jQuery("#save").click(function(){
            self.saved[jQuery("#docid").val()] = undefined;
        });
        jQuery("#delete_button").click(function() {
            var yes = confirm("Are you sure you want to permanently delete "
                +jQuery("#title").val()+"");
            if ( yes )
            {
                jQuery("#userdata").val(self.encrypted);
                jQuery("#delete").val("true");
            }
        });
    };
    /**
     * Build the HTML of this form and append it to the target div
     */
    this.buildHtml = function() {
        if ( this.isEditor() )
        {
            var html = '<form method="POST" accept-charset="UTF-8" action="/misc/">';
            html += '<table id="toolmenu"><tr><td><span class="prompt">Project:</span>';
            html += '<select id="project"></select>';
            html += '<span class="prompt">Category:</span>';
            html += '<select id="category"></select>';
            html += '<span class="prompt">File:</span>';
            html += '<select id="files"></select></td></tr>';
            html += '<tr><td><span class="prompt">Title:</span>';
            html += '<input type="text" id="title"></input>';
            html += '<input id="new" type="button"Value="New"></input>';
            html += '<input type="submit" id="delete_button" value="Delete"></input>';
            html += '<input type="submit" id="save" value="Save"></input></td></tr></table>';
            html += '<textarea name="text" rows="30" cols="50" id="text"></textarea>';
            html += '<input type="hidden" id="docid" name="docid"></input>';
            html += '<input type="hidden" name="format" value="text/x-markdown"></input>';
            html += '<input type="hidden" id="source" name="source"></input>';
            html += '<input type="hidden" id="delete" name="delete"></input>';
            html += '<input type="hidden" id="userdata" name="userdata"></input>';
            html += '</form>';
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
    console.log(params['udata']);
    var me = new misceditor(params['target'],params['udata']);
});

