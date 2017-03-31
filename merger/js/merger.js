/**
 * global document object
 */
function merger( target, udata )
{
    this.key = "I tell a settlers tale of the old times";
    // save a copy of the old userdata for later verification
    this.encrypted = udata;
    this.target = target;
    var self = this;
    /**
     * Decode an encrypted userdata string using the key.
     */
    this.merger_decode = function( enc ) {
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
    /**
     * Post a changed event to the server
     * @param url the url to post to
     * @param service type of change: append this to the url
     * @param obj an ordinary object with name value pairs to upload
     * @param succ success function(data, textStatus, jqXHR)
     * @param fail function(jqXHR, textStatus, errorThrown)
     */
    this.postObj = function( url, obj, succ, fail ) {
        var jqxhr = jQuery.ajax(url,{
            type:"POST",
            data: obj,
            success: succ,
            error: fail
        });
    };
    /**
     * Fill in the project names in the project menu
     */
    this.buildProjectMenu = function(){
        var url = "http://"+window.location.hostname+"/project/list";
        jQuery.get(url,function(data){
            var select = jQuery("#projid");
            for ( var i=0;i<data.length;i++ )
                select.append('<option value="'+data[i].docid+'">'+data[i].description+'</option>');
            jQuery('#projid option[value="english/harpur"]').prop('selected', true);
            self.buildPrefixMenu();
            jQuery("#projid").change(function(){
                self.buildPrefixMenu();
            });
            jQuery("#doc_prefix").change(function(){
                self.buildDocumentsMenu();
            });
        });
    };
    /**
     * Shorten the raw list of document layers to just documents
     * @param data the list of docids returned by /project/layers
     * @return an array of document identifiers
     */
    this.summarise = function(data) {
        var hash = {};
        var prefix = jQuery("#projid").val()+"/"+jQuery("#doc_prefix").val();
        for ( var i=0;i<data.length;i++ )
        {
            var index = data[i].indexOf(prefix);
            if ( index == 0 )
            {
                var sub = data[i].substring(prefix.length+1);
                index = sub.indexOf("/");
                if ( index != -1 )
                    hash[sub.substring(0,index)]=1;
                else
                    hash[sub] = 1;
            }
        }
        var arr = Array();
        for (var key in hash) {
            arr.push(key);
        }
        return arr;
    };
    this.buildDocumentsMenu = function(){
        var url = "http://"+window.location.hostname+"/project/layers?docid="+jQuery("#projid").val()+"/"+jQuery("#doc_prefix").val();
        jQuery.get(url,function(data){
            jQuery("#documents").empty();
            var docs = self.summarise(data);
            var prefix = jQuery("#projid").val()+"/"+jQuery("#doc_prefix").val()+"/";
            for ( var i=0;i<docs.length;i++ )
            {
                jQuery("#documents").append('<option value="'+prefix+docs[i]+'">'+docs[i]+'</option>');
            }
            jQuery("#"+self.target).css("visibility","visible");
            if ( jQuery("#documents option").length > 0 )
                jQuery("#rebuild_button").removeAttr("disabled");
        });
    };
    /**
     * Prefixes if present are in the project data
     */
    this.buildPrefixMenu = function(){
        var projid = jQuery("#projid").val();
        var url = "http://"+window.location.hostname+"/project/metadata?docid="+projid;
        jQuery.get(url,function(data){
            jQuery("#doc_prefix").empty();
            for ( var i=0;i<data.sections.length;i++ )
            {
                jQuery("#doc_prefix").append('<option value="'+data.sections[i]
                    +'">'+data.sections[i]+'</option>');
            }
            self.buildDocumentsMenu();
        });
    };
    var decoded = this.merger_decode(udata);
    this.userdata = JSON.parse(decoded);
    var html ='<form target="response_frame" action="http://'+window.location.hostname+'/merger/rebuild/" '
        +'method="post">'
        +'<p><select name="projid" id="projid"></select> '
        +' Prefix: '
        +'<select name="prefix" id="doc_prefix"></select>'
        +'Document: '
        +'<select name="documents" id="documents"></select>'
        +'<input type="submit" disabled="disabled" id="rebuild_button" value="rebuild"></input></p>'
        +'<input type="hidden" id="docid" name="docid"></input>'
        +'</form><iframe id="response_frame" name="response_frame"></iframe>';
    var targ = jQuery("#"+this.target);
    targ.append(html);
    this.buildProjectMenu();
    jQuery("#rebuild_button").click(function(){
        jQuery("#docid").val(jQuery("#documents").val());
    });
    jQuery("#response_frame").load(function(e){
        var text = jQuery(this).contents().text();
        var jObj;
        var index = text.indexOf("503 Service Unavailable");
        if ( index!=-1 )
            jObj = JSON.parse('{"error":"Error 503: Service unavailable"}');
        else
            jObj= JSON.parse(text);
        jQuery(".error").remove();
        jQuery("#log").remove();
        if ( jObj.error != undefined )
            jQuery("#"+self.target).append('<p class="error">'+jObj.error+'</p>');
        else
        {
            jQuery("#"+self.target).append('<div id="log"></div>');
            jQuery("#log").append('<p>'+jObj.messages+'</p>');
            var pos = jQuery("#log").offset().top;
            var wHt = jQuery(window).height();
            jQuery("#log").height((wHt-pos)*0.6);
        }
    });
    targ.css("visibility","visible");
}
function get_one_param( params, name )
{
    var parts = params.split("&");
    for ( var i=0;i<parts.length;i++ )
    {
        var halves = parts[i].split("=");
        if ( halves.length==2 && halves[0]==name )
            return unescape(halves[1]);
    }
    return "";
}
/**
 * This reads the "arguments" to the javascript file
 * @param scrName the name of the script file minus ".js"
 */
function getMergerArgs( scrName )
{
    var params = new Object ();
    var module_params = jQuery("#merger_params").val();
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
    }
    if ( !('udata' in params) )
    {
        var tabs_params = jQuery("#tabs_params").val();
        if ( tabs_params != undefined && tabs_params.length>0 )
            params['udata'] = get_one_param(tabs_params,'udata');
    }
    return params;
}
/* main entry point - gets executed when the page is loaded */
jQuery(function(){
    var params = getMergerArgs('merger');
    jQuery("#"+params['mod-target']).css("visibility","hidden");
    var sp = new merger(params['mod-target'],params['udata']);
});



