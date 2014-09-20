/**
 * Object to represent documents in
 * @param target the id of the element to add ourselves to as a child
 * @param docid the docid of the project e.g. italian/deroberto/ivicere
 */
function documents(target,docid)
{
    this.target = target;
    /**
     * Copy the generated html into the document
     * @param the html to append to the target
     */
    this.setHtml = function( html )
    {
        var tgt = jQuery("#"+this.target);
        tgt.append(html);
    };
    var self = this;
    jQuery.get( "http://"+window.location.hostname+"/project/documents/"+docid, function(data)
    {
        var html = "";
        var pDoc = JSON.parse(data);
        /* {documents:[{docid:"italian/deroberto/ivicere/cap1",title:""I Vicerè",description:"I Vicerè"},...]} */
        html += '<ul class="documents">';
        var docs = pDoc.documents;
        if ( docs != undefined )
        {
            for ( var i=0;i<docs.length;i++ )
            {
                html += '<li>';
                html += '<p><a href="http://'+window.location.hostname+'/mml_edit?docid='+docs[i].docid+'">';
                html += '<i ';
                if ( docs[i].title != undefined )
                    html += 'title="'+docs[i].title+'" ';
                html += 'class="fa fa-file-text-o fa-5x"></i>';
                html += '</a></p>';
                html += '<p><span class="description">'+docs[i].description+'</span></p>';
                html += '</li>';
            }
        }
        html += '</ul>';
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
        var params = getArgs('documents.js');
        var editor = documents(params['target'],params['docid']);
    }
); 
