/**
 * Object to represent documents in cortex collection
 * @param target the id of the element to add ourselves to as a child
 * @param docid the docid of the project e.g. italian/deroberto/ivicere
 * @param work the name of the work
 * @param author the name of the author
 */
function documents(target,docid,work,author)
{
    this.target = target;
    this.author = author;
    this.work = work;
    this.num_untitleds = 1;
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
        var html = '<h2>'+author+': '+work+'</h2>\n';
        var pDoc = data;
        html += '<ul class="documents">';
        var docs = pDoc.documents;
        if ( docs != undefined )
        {
            var paths = window.location.pathname.split("/");
            var path = (paths.length>1)?"/"+paths[1]:"";
            for ( var i=0;i<docs.length;i++ )
            {
                html += '<li>';
                html += '<p><a href="http://'+window.location.hostname
                     +path+'/mml_edit?docid='+docs[i].docid;
                html += '&version1='+docs[i].version1+'">';
                html += '<i ';
                if ( docs[i].section != undefined )
                    html += 'title="'+docs[i].section+'" ';
                html += 'class="fa fa-file-text-o fa-5x"></i>';
                html += '</a></p>';
                html += '<p><span class="section">'+docs[i].section+'</span></p>';
                html += '</li>';
            }
        }
        html += '<li title="new document" '
            +'id="new_button" class="add-button"><i '
            +'class="fa fa-plus-square fa-lg"></i></li>';
        html += '</ul>';
        self.setHtml(html);
        jQuery("#new_button").click( function(event) {
            var html = '<li>';
                html += '<p><a href="http://'+window.location.hostname
                     +path+'/mml_edit?docid='+docid+"/untitled"+self.num_untitleds;
                self.num_untitleds++;
                html += '&version1=/base/A">';
                html += '<i ';
                html += 'title="untitled" ';
                html += 'class="fa fa-file-text-o fa-5x"></i>';
                html += '</a></p>';
            html += '</li>';
            jQuery(this).before(html);
        });
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
        var editor = documents(params['target'],params['docid'],params['work'],params['author']);
    }
); 
