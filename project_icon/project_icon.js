/**
 * Object to represent sponsors in HTML
 * @param target the target id of the element to append ourselves to
 * @param editor true if we are an editor else false
 */
function project_icon(target,editor)
{
    this.target = target;
    this.setHtml = function( html )
    {
        var tgt = jQuery("#"+this.target);
        tgt.append(html);
    };
    var self = this;
    jQuery.get( "http://"+window.location.hostname+"/project/list", function(data) 
    {    
        var html = "";
        var icons = JSON.parse(data);
        for ( var i=0;i<icons.length;i++ )
        {
            html += '<div class="project"><a href="http://';
            if (editor)
            {
                var index = window.location.pathname.indexOf("/node");
                var path = window.location.pathname;
                var path = (index!=-1)?path.substring(0,index):path;
                if ( path.length>0&&path.charAt(path.length-1)=='/' )
                    path = path.substring(0,path.length-1);
                html += window.location.hostname+path+'/project_edit';
            }
            else
                html += window.location.hostname+'/project/view';
            html += '?docid='+icons[i].docid+'">\n'
            +'<img src="http://'+window.location.hostname+'/mml/corpix/'+icons[i].docid+'/project/icon"'
            +' title="'+icons[i].description+'"></a>\n<p>'+icons[i].description+'</p></div>';
        }
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
        var params = getArgs('project_icon');
        new project_icon(params['target'],params['role']!=undefined&&params['role']=='editor');
    }
); 
