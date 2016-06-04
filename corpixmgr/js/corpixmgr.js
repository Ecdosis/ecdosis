function CorpixManager( target, projid )
{
    var self = this;
    this.target = target;
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
            self.createEventHandlers();
            jQuery("#url_button").attr('disabled',true);
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
     * Set up the event handlers
     */
    this.createEventHandlers = function() {
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
            }
        });
    };
    this.createButtonHandlers = function(){
        // click handler for copy url button
        jQuery("#url_button").click(function(e){
            var url = jQuery("#preview img").attr("src");
            var ind = url.indexOf("?");
            if ( ind != -1 )
            {
                url = url.substring(ind+1);
                var parts = url.split("&");
                var params = {};
                for ( var i=0;i<parts.length;i++ )
                {
                    var halves = parts[i].split("=");
                    if ( halves.length==2 )
                        params[halves[0]] = halves[1];
                }
            }
            var copy = "/corpix/"+params['docid']+params['url'];
            window.prompt("Copy link: Ctrl/Cmd + C, Enter", copy);
            return false;
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
        var html = '<form id="corpix-wrapper" method="POST" action="/corpixmgr/">';
        html += '<div id="corpix-lhs"><table id="corpix-toolbar"><tr><td>';
        html += '<span class="prompt">Project:</span>';
        html += '<select id="project"></select>';
        html += '<input type="button" id="add_button" value="add"></input>';
        html += '<input type="button" id="delete_button" value="delete"></input>';
        html += '<input id="url_button" type="button" value="copy" disabled title="copy location">';
        html += '</input></tr></td></table>';
        html += '<div id="filelist-wrapper"><div id="corpix-filelist"></div></div></div>';
        html += '<div id="corpix-rhs"><div id="preview"></div></div>';
        html += '<input type="hidden" id="subpath" name="subpath"></input>';
        html += '</form>';        
        jQuery("#"+this.target).empty();
        jQuery("#"+this.target).append(html);
        this.createButtonHandlers();
    };
    // set the ball rolling

    this.buildHtml(projid);
    this.scaleBoxes();
    this.loadProjectList();
    jQuery("#project").val(projid);
    jQuery("#subpath").val("/");
}
jQuery(document).ready(function(){
   var cm = new CorpixManager("content","english/harpur");
});

