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
    var self = this;
    this.languages = ["italian","english","german"];
    this.removeParam = function( jObj, key ) {
        var res = "";
        var parts = jObj.split("&");
        for ( var i=0;i<parts.length;i++ )
        {
            var halves = parts[i].split("=");
            if ( halves.length == 2 )
            {
                if ( halves[0]!=key )
                {
                    if ( res.length > 0 )
                        res += "&";
                    res += halves[0]+"="+halves[1];
                }
            }
        }
        return res;
    };
    this.langSelect = function() {
        var html = '<select id="language">';
        for ( var i=0;i<this.languages.length;i++ )
        {
            html += '<option>';
            html += this.languages[i];
            html += '</option>';
        }
        html += '</select>';
        return html;
    };
    this.authorBox = function() {
        var html = "";
        html += '<input type="text" id="author" placeholder="author">';
        html += '</input>';
        return html;
    };
    this.workBox = function() {
        var html = "";
        html += '<input type="text" id="work" placeholder="work">'
        html += '</input>';
        return html;
    };
    this.stripSpaces = function(str) {
        return str.replace(/\s/g, '');
    };
    this.setHtml = function( html )
    {
        var tgt = jQuery("#"+this.target);
        tgt.append(html);
        // set up submission via ajax 
        jQuery("#form1").submit(function(event) {
            var icon_file = jQuery("input[name='icon_file']").val();
            if ( icon_file==undefined||icon_file.length==0 ) {
                var url = jQuery("#form1").attr("action");
                if ( docid=='english/anonymous' )
                {
                    var l = jQuery("#language").val();
                    var a = self.stripSpaces(jQuery("#author").val());
                    var w = self.stripSpaces(jQuery("#work").val());
                    if ( a==undefined||a.length==0 )
                    {
                        alert("Author cannot be empty");
                        return false;
                    }
                    if ( w==undefined||w.length==0 )
                    {
                        alert("Work cannot be empty");
                        return false;
                    }
                    var did = l+"/"+a+"/"+w;
                    console.log("docid="+did);
                    jQuery("#docid").val(did);
                } 
                var jObj = jQuery("#form1").serialize();
                jObj = self.removeParam(jObj,"source");
                jQuery.ajax({
                    type: "POST",
                    url: url,
                    data: jObj,
                    success: function(data)
                    {
                        console.log("saved project");
                    }
                });
                event.preventDefault();
            }
        });
        jQuery("#save_button").click( function() {
            jQuery("#form1").submit();
        });
        /** 
         * Shorten a standard docid to language/author
         * @param docid a full docid
         * @return a language/author shortened id
         */
        this.shortId = function( docid )
        {
             var parts = docid.split("/");
             if ( parts.length >= 2 )
                 return parts[0]+"/"+parts[1];
             else
                 return docid;
        };
        jQuery("#editdocs").click( function() {
            var base = window.location.pathname.split("/");
            var root = "";
            if ( base.length>1 )
                root = base[1];  
            window.location.href = 'http://'+window.location.hostname+'/'+root
            +'/documents?docid='+docid+'&work='+self.work+'&author='+escape(self.author);
            console.log(escape(self.author));
        });
        jQuery("#editevents").click( function() {
            var base = window.location.pathname.split("/");
            var root = "";
            if ( base.length>1 )
                root = base[1];
            window.location.href = 'http://'+window.location.hostname+'/'+root
            +'/events?docid='+self.shortId(docid)+'&author='+self.author;
        });
        jQuery("#gotosite").click( function() {
            window.location.href = jQuery("#site_url").val();
        });
        jQuery("#delete_button").click( function() {
            var url = 'http://'+window.location.host+'/project/'+docid;
            jQuery.ajax({
                url: url,
                type: 'DELETE',
                success: function(result) {
                    console.log("deleted project "+docid);
                }
            });
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
    jQuery.get( "http://"+window.location.hostname+"/project/"+docid, function(data) 
    {    
        var html = "";
        var pDoc = data;
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
        self.work = work;
        self.author= author;
        var rowspan = "";
        if ( docid=='english/anonymous' )
            rowspan = ' rowspan="4"';
        html += '<tr><td'+rowspan+'>';
        html += '<img class="project" src="'+pDoc.icon+'"></td>';
        html += '<td><input type="file" name="icon_file"></input></td></tr>';
        if ( docid=='english/anonymous' )
        {
            html += '<tr><td>'+self.langSelect()+'</td></tr>';
            html += '<tr><td>'+self.authorBox()+'</td></tr>';
            html += '<tr><td>'+self.workBox()+'</td></tr>';
        }
        html += '<tr><td>Description:</td><td><input name="description" type="text" id="description" value="'+pDoc.description+'"></input></td></tr>';
        html += '<tr><td>Documents:</td><td>';
        if ( pDoc.works != undefined )
            html += pDoc.works+' documents ';
        html += '<input type="button" id="editdocs" value="edit..."></input></td></tr>';
        html += '<tr><td>Events:</td><td>';
        if ( pDoc.events != undefined )
            html += pDoc.events+' events ';
        html += '<input type="button" id="editevents" value="edit..."></input></td></tr>';
        html += '<tr><td>Site URL:</td><td><input name="site_url" type="text" id="site_url" value="'+pDoc.url+'"></input>'
            +'<input type="button" id="gotosite" value="Go to"></input></td></tr>';
        html += '<tr><td>Owner:</td>';
        html += '<td>'+self.user_select(pDoc.owner,users);
        html += '</td></tr>';
        html += '<tr><td><input id="delete_button" type="button" value="delete"></input></td><td><input id="save_button" type="button" value="save"></input></td></tr>';
        html += '</table>\n';
        html += '<input type="hidden" name="docid" id="docid" value="'+pDoc.docid+'"></input>';
        html += '<input name="source" type="hidden" value="'+window.location.href+'"></input>';
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
