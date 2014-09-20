/**
 * Object to represent sponsors in HTML
 * @param target the id of the element to add ourselves to as a child
 * @param docid the docid of the project e.g. italian/deroberto/ivicere
 * @param users the user list as a string uid:1;uname:joe$uid:2;uname:mary...
 * @param docs the relative url to the documents list for this project
 */
function project_edit(target,docid,users,docs)
{
    this.target = target;
    this.setHtml = function( html )
    {
        var tgt = jQuery("#"+this.target);
        tgt.append(html);
        jQuery("#save_button").click( function() {
            jQuery("#form1").submit();
        });
        jQuery("#editdocs").click( function() {
            var base = window.location.pathname.split("/");
            var root = "";
            if ( base.length>1 )
                root = base[1];  
            window.location.href = 'http://'+window.location.hostname+'/'+root
            +'/documents?docid='+docid;
        });
        jQuery("#gotosite").click( function() {
            window.location.href = jQuery("#site_url").val();
        });
        jQuery("#delete_button").click( function() {
            alert("unimplemented");
        });
    };
    this.user_select = function(owner,users)
    {
        var uarray = users.split('$');
        var html = '<select name="owner" id="owner">';
        for ( var i=0;i<uarray.length;i++ )
        {
            var parts = uarray[i].split('#');
            if (parts.length==2)
            {
                var uid = parts[0];
                var name = parts[1];
                var id = uid.split(":");
                var uname = name.split(':');
                if ( uname.length==2 && id.length==2 )
                {
                    html += '<option value="'+uname[1]+'"'
                    if ( owner == uname[1] )
                       html += " selected";
                    html += '>';
                    html += uname[1];
                    html += '</option>';
                }
            }
        }
        html += '</select>';
       return html;
    };
    var self = this;
    jQuery.get( "http://"+window.location.hostname+"/project/"+docid, function(data) 
    {    
        var html = "";
        var pDoc = JSON.parse(data);
        /* "docid" : "italian/deroberto/ivicere", "url" : "http://ecdosis.net/deroberto" }*/
        html += '<div class="project_edit">';
        html += '<form id="form1" action="'+'http://'+window.location.hostname+'/project/"';
        html += ' enctype="multipart/form-data"';
        html += ' method="post">\n';
        html += '<table>';
        var docid_parts = pDoc.docid.split("/");
        var language = (pDoc.language!=undefined)?pDoc.language:docid_parts[0];
        var author = (pDoc.author!=undefined)?pDoc.author:docid_parts[1];
        var work = (pDoc.work!=undefined)?pDoc.work:docid_parts[2];
        html += '<tr><td>';
        html += '<img class="project" src="'+pDoc.icon+'"></td><td><input type="file" name="icon_file"></input>';
        html += '</td></tr>';
        html += '<tr><td>Language:</td><td><input readonly name="language" type="text" id="language" value="'+language+'"></input></td></tr>';
        html += '<tr><td>Author:</td><td><input readonly name="author" type="text" id="author" value="'+author+'"></input></td></tr>';
        html += '<tr><td>Work:</td><td><input readonly name="work" type="text" id="work" value="'+work+'"></input></td></tr>';
        html += '<tr><td>Description:</td><td><input name="description" type="text" id="description" value="'+pDoc.description+'"></input></td></tr>';
        html += '<tr><td>Documents:</td><td>';
        if ( pDoc.works != undefined )
            html += pDoc.works+' documents ';
        html += '<input type="button" id="editdocs" value="edit..."></input></td></tr>'
        html += '<tr><td>Site URL:</td><td><input name="site_url" type="text" id="site_url" value="'+pDoc.url+'"></input>'
            +'<input type="button" id="gotosite" value="Go to"></input></td></tr>';
        html += '<tr><td>Owner:</td>';
        html += '<td>'+self.user_select(pDoc.owner,users);
        html += '</td></tr>';
        html += '<tr><td><input id="delete_button" type="button" value="delete"></input></td><td><input id="save_button" type="button" value="save"></input></td></tr>';
        html += '</table>\n';
        html += '<input type="hidden" name="docid" id="docid" value="'+pDoc.docid+'"></input>';
        html += '</form>';
        html += '</div>';
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
        var params = getArgs('project_edit');
        var editor = new project_edit(params['target'],params['docid'],params['editors'],params['docs']);
    }
); 
