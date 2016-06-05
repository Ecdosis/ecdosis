function CorpixManager( target, udata )
{
    var self = this;
    this.target = target;
    this.key = "I tell a settlers tale of the old times";
    // save a copy of the old userdata for later verification
    this.encrypted = udata;
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
     * Is this file-name of an image?
     */
    this.isImage = function( name ) {
        var term = name.length-4;
        return term > 0 && (name.lastIndexOf(".jpg")==term
             || name.lastIndexOf(".png")==term
             || name.lastIndexOf(".tif")==term);

    };
    this.loadFileList = function() {
        var url = "/corpixmgr/list?docid="+jQuery("#project").val();
        url += "&subpath="+jQuery("#subpath").val();
        jQuery.get(url,function(data){
            var html = '<ul id="corpix-files">';
            for ( var i=0;i<data.length;i++ )
            {
                html += '<li>';
                if ( 'isdir' in data[i] && data[i].isdir )
                    html += '<i class="fa fa-lg fa-folder-o"></i> ';
                else if ( self.isImage(data[i].name) )
                    html += '<i class="fa fa-lg fa-file-image-o"></i> ';
                else
                    html += '<i class="fa fa-lg fa-file-o"></i> ';
                if ( data[i].name == ".." )
                    html += ".. <em>up a level</em>";
                else
                    html += data[i].name;
                html == '</li>';
            }
            html += '</ul>';
            jQuery("#corpix-filelist").empty();
            jQuery("#corpix-filelist").append(html);
            self.updateFileHandlers();
            jQuery("#url_button").attr('disabled',true);
            jQuery("#delete_button").attr('disabled',true);
        });
    };
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
                    +data[i].docid+'">'+data[i].work+'</option>\n');
            }
            self.loadFileList();
        });
    };
    /**
     * Get the value in px of a css property
     * @return an integer
     */
     this.cssValue = function(obj,prop) {
        var value = obj.css(prop);
        var index = value.indexOf("px");
        if ( index != -1 )
            return parseInt(value.substring(0,index));
        else
            return parseInt(value);
    };
    /**
     * Is this li element a directory or not?
     * @return true if it is else false
     */
    this.isDirectory = function( obj ) {
        return obj.children("i").hasClass("fa-folder-o");
    };
    /**
    * Get the metadata for an image
    * @param name the name of the image
    */
    this.getMetadata = function( name ) {
        if ( jQuery("#metadata").length==0 )
        {
            var path = jQuery("#subpath").val()+"/"+name;
            var url = "/corpixmgr/metadata?docid="+jQuery("#project").val()+"&url="+path;
            jQuery.get(url,function(data){
                var metadata = '<div id="metadata">';
                metadata += '<span class="label">height: </span>'+data.height;
                metadata += '; <span class="label">width: </span>'+data.width+'<br>';
                metadata += '<span class="label">image type: </span>'+data.type+'<br>';
                metadata += '<span class="label">compression: </span>'+data.compression+'%<br>';
                metadata += '<span class="label">size: </span>'+Math.round(data.size/1024)+'K</div>';
                jQuery("#preview").append(metadata);
            });
        }
    };
    /**
     * Read the params of the currently selected preview image
     * @return an object containing the params
     */
    this.getPreviewImageParams = function() {
        var url = jQuery("#preview img").attr("src");
        var ind = url.indexOf("?");
        var params = {};
        if ( ind != -1 )
        {
            url = url.substring(ind+1);
            var parts = url.split("&");
            for ( var i=0;i<parts.length;i++ )
            {
                var halves = parts[i].split("=");
                if ( halves.length==2 )
                    params[halves[0]] = halves[1];
            }
        }
        return params; 
    };
    /**
     * Get the last part of a url
     * @param url the url to get it from
     * @return the url's file-name
     */
    this.getFileName = function(url) {
        var parts = url.split("/");
        return parts[parts.length-1];
    };
    /**
     * Remove a file from the sorted list
     * @param name the name of the file to delete
     */
    this.deleteFile = function(name){
        var delendum = -1;
        jQuery("#corpix-filelist li").each(function(i){
            var item = jQuery(this).text();
            if ( item != undefined && item.length> 0 && item.trim() == name )
                delendum = i;
        });
        if ( delendum != -1 )
            jQuery('#corpix-filelist li:eq('+delendum+')').remove();
    };
    /**
     * Add a file to the sorted list in order
     * @param name the name of the file to add
     */
    this.insertFile = function(name){
        var insertPos = 0;
        jQuery("#corpix-filelist li").each(function(i){
            var item = jQuery(this).text();
            if ( item != undefined && item.length> 0 && item.trim() >= name )
                if ( insertPos == 0 )
                    insertPos = i;
        });
        var li = '<li>';
        if ( self.isImage(name) )
            li += '<i class="fa fa-lg fa-file-image-o"></i> ';
        else
            li += '<i class="fa fa-lg fa-file-o"></i> ';
        li += name;
        li += '</li>';
        jQuery('#corpix-filelist li:eq('+insertPos+')').before(li);
        this.updateFileHandlers();
    };
    /**
     * Set up the event handlers
     */
    this.updateFileHandlers = function() {
        jQuery("#corpix-files li").off("dblclick");
        // double-click handler
        jQuery("#corpix-files li").dblclick(function(){
            var text = jQuery(this).text().trim();
            if ( text.length>1&&text.substring(0,2) == ".." )
            {
                var sp = jQuery("#subpath").val();
                var parts = sp.split("/");
                var newPath = "";
                for ( var i=0;i<parts.length-1;i++ )
                {
                    newPath += "/"+parts[i];
                }
                if ( newPath.length==0 )
                    newPath = "/";
                jQuery("#subpath").val(newPath);
                jQuery("#preview").empty();
            }
            else if ( self.isDirectory(jQuery(this)) )
            {
                var old = jQuery("#subpath").val();
                var parts = old.split("/");
                if ( parts.length==0 || parts[parts.length-1] != text )
                {
                    if ( jQuery("#subpath").val() == "/" )
                        jQuery("#subpath").val(old+text);
                    else
                        jQuery("#subpath").val(old+"/"+text);
                }
            }
            self.loadFileList();
        });
        // single click handler (NB also fires on dblclick)
        jQuery("#corpix-files li").off('click');
        jQuery("#corpix-files li").click(function(){
            var name = jQuery(this).text().trim();
            if ( self.isImage(name) )
            {
                var width = Math.round((jQuery("#corpix-rhs").width()*9)/10);
                var height = Math.round((jQuery("#corpix-rhs").height()*8)/10);
                var preview = jQuery("#preview");
                preview.empty();
                var url = "/corpixmgr/thumbnail?docid="+jQuery("#project").val();
                url += "&url="+jQuery("#subpath").val()+"/"+name;
                url += "&maxwidth="+width;
                url += "&maxheight="+height;
                //console.log("width="+width+" height="+height);
                preview.append('<img src="'+url+'">');
                self.getMetadata(name);
                jQuery("#url_button").attr('disabled',false);
                jQuery("#delete_button").attr('disabled',false);
            }
        });
    };
    /**
     * Create handlers for the buttons on the toolbar
     */
    this.createButtonHandlers = function(){
        // click handler for copy url button
        jQuery("#url_button").click(function(e){
            var params = self.getPreviewImageParams();
            var copy = "/corpix/"+params['docid']+params['url'];
            window.prompt("Copy link: Ctrl/Cmd + C, Enter", copy);
            return false;
        });
        jQuery("#delete_button").click(function(){
            jQuery("#userdata").val(self.encrypted);
            var params = self.getPreviewImageParams();
            params.userdata = jQuery("#userdata").val();
            jQuery.post("/corpixmgr/delete",params,
                function( res, status, jqXHR )
                {
                    if ( !res.success )
                        alert( res.message );
                    else
                    {
                        var name = self.getFileName(params['url']);
                        self.deleteFile(name);
                        jQuery("#preview").empty();
                    }
                }
            );
        });
        jQuery("#fileUpload").change(function(){
            jQuery("#userdata").val(self.encrypted);
            jQuery("#corpix-wrapper").trigger('submit');
            var intervalid = setInterval(function(){
                var html = jQuery('#myiframe').contents().find("html");
                var pre = html.find("pre");
                if ( pre.text().length > 0)
                {
                    var jObj = JSON.parse( pre.text() );
                    if ( !jObj.success )
                        alert(jObj.message);
                    else
                    {
                        var name = jQuery("#fileUpload").val();
                        self.insertFile(name);
                    }
                    clearInterval(intervalid);
                }
            },1000);
        });
        jQuery("#add_button").click(function(){
            jQuery("#fileUpload").trigger('click');
        });
    };
    /**
     * Scale the various boxes of the display
     */
    this.scaleBoxes = function() {
        var ht = jQuery(window).height()-jQuery("#corpix-wrapper").offset().top;
        var parent = jQuery("#corpix-wrapper").parent();
        var bot = this.cssValue(parent,"margin-bottom");
        var top = this.cssValue(parent,"margin-top");
        var wrHt = ht-(top+bot);
        var lhsWd = jQuery("#corpix-lhs").outerWidth();
        var wrWd = jQuery("#corpix-wrapper").outerWidth();
        jQuery("#corpix-wrapper").height(wrHt);
        jQuery("#corpix-lhs").outerWidth(jQuery("#corpix-lhs").width());
        var tbHt = jQuery("#corpix-toolbar").height();
        jQuery("#filelist-wrapper").height(wrHt-tbHt);
        jQuery("#corpix-rhs").innerHeight(wrHt+1);
        jQuery("#corpix-rhs").outerWidth(wrWd-lhsWd);
        jQuery("#corpix-toolbar").innerWidth(jQuery("#corpix-toolbar").width());
    };
    /**
     * Build the HTML of this form and append it to the target div
     */
    this.buildHtml = function() {
        if ( this.isEditor() )
        {
            var html = '<form id="corpix-wrapper" enctype="multipart/form-data" ';
            html += 'method="POST" target="myiframe" action="/corpixmgr/add">';
            html += '<div id="corpix-lhs"><table id="corpix-toolbar"><tr><td>';
            html += '<span class="prompt">Project:</span>';
            html += '<select name="docid" id="project"></select>';
            html += '<input type="button" id="add_button" value="add"></input>';
            html += '<input type="button" id="delete_button" disabled value="delete"></input>';
            html += '<input id="url_button" type="button" value="copy" disabled title="copy location">';
            html += '</input><input type="file" style="display:none" name="fileupload" '
            html += 'id="fileUpload"></input></tr></td></table>';
            html += '<div id="filelist-wrapper"><div id="corpix-filelist"></div></div></div>';
            html += '<div id="corpix-rhs"><div id="preview"></div></div>';
            html += '<input type="hidden" id="subpath" name="subpath"></input>';
            html += '<input type="hidden" id="userdata" name="userdata"></input>';
            html += '</form><iframe id="myiframe" name="myiframe"></iframe>';        
            jQuery("#"+this.target).empty();
            jQuery("#"+this.target).append(html);
            this.createButtonHandlers();
            return true;
        }
        else
        {
            var html = '<p class="error">You are not logged in</p>';
            jQuery("#"+this.target).empty();
            jQuery("#"+this.target).append(html);
            jQuery("#"+this.target).css("visibility","visible");
            return false;
        }
    };

    // set the ball rolling
    if ( this.buildHtml() )
    {
        this.scaleBoxes();
        this.loadProjectList();
        jQuery("#subpath").val("/");
    }
}
/**
 * This reads the "arguments" to the javascript file
 * @param scrName the name of the script file minus ".js"
 */
function getCorpixMgrArgs( scrName )
{
    var params = new Object ();
    var module_params = jQuery("#corpixmgr_params").val();
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
    var params = getCorpixMgrArgs('corpixmgr');
    var cm = new CorpixManager(params['target'],params['udata']);
});

