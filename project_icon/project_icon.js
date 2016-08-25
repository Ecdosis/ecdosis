/**
 * Object to represent sponsors in HTML
 * @param target the target id of the element to append ourselves to
 * @param editor true if we are an editor else false
 * @param owner the owner of a new project
 */
function project_icon(target,editor,owner)
{
    this.target = target;
    this.owner = owner;
    /**
     * Copy the generated html to the target
     * @param html the html to implant
     */
    this.setHtml = function( html )
    {
        var tgt = jQuery("#"+this.target);
        tgt.append(html);
    };
    /**
     * Create the markup for the new button
     * @return the HTML of the new button as a div
     */
    this.newButton = function() {
        return '<div title="new project" '
            +'id="new_button" class="event-button"><i '
            +'class="fa fa-plus-square fa-lg"></i></div>';
    };
    /**
     * Create the markup for the remove new project button
     * @return the HTML of the remove button as a div
     */
    this.removeButton = function() {
        return '<div title="remove empty project" '
            +'id="remove_button" class="event-button"><i '
            +'class="fa fa-minus-square fa-lg"></i></div>';
    };
    /**
     * Create a plain js object of an empty project
     * @return a plain js object
     */
    this.emptyProject = function() {
        var blank = new Object();
        blank.work = "Untitled";
        blank.author = "Anonymous";
        blank.description = "Empty";
        blank.owner = this.owner;
        blank.docid = "english/anonymous";
        blank.url = "http://localhost";
        return blank;
    };
    /** 
     * Add the click handler to the new project button
     */
    this.installNewButton = function() {
	jQuery("#new_button").click( function(event) {
            var buttonDiv = jQuery("#new_button");
            var jobj = self.emptyProject();
            var projectDiv = self.newProject(true,jobj,"new-project");
	    buttonDiv.before( projectDiv );
            buttonDiv.replaceWith(self.removeButton());
            self.installRemoveButton();
        });
    };
    /** 
     * Add the click handler to the remove new project button
     * 
     */
    this.installRemoveButton = function() {
        jQuery("#remove_button").click( function(event) {
            jQuery(".new-project").remove();
            jQuery("#remove_button").replaceWith(self.newButton());
            self.installNewButton();
        });
    };
    /**
     * Shorten the docid to only the first two components
     * @param docid a long docid
     * @return a two-component docid
     */
    this.shorten = function( docid ) {
        var parts = docid.split("/");
        if ( parts.length >= 2 )
            return parts[0]+"/"+parts[1];
        else
            return docid;
    };
    /**
     * Create a new project icon
     * @param editor true if the user is editor
     * @param jdoc the json document describing the project
     * @param projectClass the name of the class of project dov
     * @return the new project div as HTML
     */
    this.newProject = function( editor, jdoc, projectClass ) {
        var html = '<div class="'+projectClass+'"><a href="http://';
        if (editor)
        {
            var path = window.location.pathname;
            var parts = path.split("/");
            if ( parts.length==0 )
                path="";
            else
                path = parts[1];
            html += window.location.hostname+'/'+path+'/project_edit';
        }
        else
            html += window.location.hostname+'/project/view';
        html += '?docid='+jdoc.docid+'">\n'
        +'<img src="http://'+window.location.hostname+'/corpix/'+this.shorten(jdoc.docid)+'/project/icon"'
        +' title="'+jdoc.description+'"></a>\n<p>'+jdoc.description+'</p></div>';
        return html;
    };
    // code to execute on object creation
    var self = this;
    jQuery.get( "http://"+window.location.hostname+"/project/list", function(data)
    {
        var html = "";
        var icons = data;//JSON.parse(data);
        var tgt = jQuery("#"+this.target);
        tgt.children().remove();
        for ( var i=0;i<icons.length;i++ )
            html += self.newProject(editor,icons[i],"project");
        if ( editor )
   	    html += self.newButton();
        self.setHtml(html);
        self.installNewButton();
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
        var params = getArgs('project_icon');
        console.log("target="+params['target']+" role="+params['role']+" owner="+params['owner']);
        new project_icon(params['target'],params['role']!=undefined&&params['role']=='editor',params['owner']);
    }
);

