/**
 * global document object
 */
function splitter( target, udata )
{
    this.key = "I tell a settlers tale of the old times";
    // save a copy of the old userdata for later verification
    this.encrypted = udata;
    this.target = target;
    var self = this;
    /**
     * Decode an encrypted userdata string using the key.
     */
    this.splitter_decode = function( enc ) {
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
    this.maxLayer = function( arr ){
        var maxi = 0;
        for ( var i=0;i<arr.length;i++ )
            if ( arr[i].layer > maxi )
                maxi = arr[i].layer;
        return Math.round(maxi);
    }
    this.rangeDropdown = function( mini, maxi, defValue ){
        var select = '<select>';
        for ( var i=mini;i<=maxi;i++ )
        {
            if ( i == defValue )
                select += '<option value="'+i+'" selected="selected">'+i+'</option>';
            else
                select += '<option value="'+i+'">'+i+'</option>';
        }
        select += '</select>';
        return select;
    };
    this.hBorderWidth = function(cell){
        var lraw = cell.css("border-left-width");
        var rraw = cell.css("border-right-width");
        return parseFloat(lraw,10)+parseFloat(rraw);
    };
    this.setHeaderCellWidth = function(id) {
        var th = jQuery("#results-header th:eq("+id+")");
        var td = jQuery("#results tr:eq(0) td:eq("+id+")");
        var wd = td.width();
        th.width(wd);
        var leftPos = td.position().left-(this.hBorderWidth(th)-this.hBorderWidth(td));
        th.css("left",leftPos+"px");
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
     * Simplify a name to a string without spaces all lowercase
     * @param str a user-entered string like a name
     */
    this.simplify = function(str) {
        str = str.toLowerCase();
        str.replace(/ /g,"_");
    };
    /**
     * Fill in the project names in the project menu
     */
    this.buildProjectMenu = function(){
        var url = "http://"+window.location.hostname+"/project/list";
        jQuery.get(url,function(data){
            var select = jQuery("#docid");
            for ( var i=0;i<data.length;i++ )
                select.append('<option value="'+data[i].docid+'">'+data[i].description+'</option>');
            jQuery('#docid option[value="english/harpur"]').prop('selected', true);
        });
    };
    /**
     * Format the original XML with line-numbers
     * @param original the original XML before splitting
     * @return HTML
     */
    this.formatOriginalXML = function(original) {
        var html = '<pre id="original">';
        var res3 = original.replace(/</g,"&lt;");
        var res4 = res3.replace(/>/g,"&gt;");
        var lines = res4.split("\n");
        for ( var i=0;i<lines.length;i++ )
        {
            html += '<span>'+lines[i]+'</span>\n';
        }
        html += '</pre>';
        return html;
    };
    /**
     * format the results as XML
     * @param results an array of split XML files
     * @param original the original xml file contents
     */
    this.formatXML = function(results,original){
        var html = '<div id="tab-container">';
        for ( var i=0;i<results.length;i++ )
        {
            var lay = (i==results.length-1)?"layer-final":"layer-"+(i+1);
            html += '<pre id="'+lay+'" class="tab-content';
            if ( i==0 )
                html += ' initial';
            html += '">';
            var res1 = results[i].replace(/</g,"&lt;");
            var res2 = res1.replace(/>/g,"&gt;");
            var lines = res2.split("\n");
            for ( var j=0;j<lines.length;j++ )
                html += '<span>'+lines[j]+'</span>\n';
            html += '</pre>';
        }
        html += '</div>';
        html += this.formatOriginalXML(original);
        return html;
    };
    /**
     * Compute the horizontal padding of an element
     * @param obj the jQuery object
     * @return an integer
     */
    this.hPadding = function( obj ){
        var lPad = parseInt(obj.css("padding-left"));
        var rPad = parseInt(obj.css("padding-right"));
        return rPad+lPad;
    };
    /**
     * The split results are a set of split XML files
     * @param results an array of XML split files
     * @param original the original XML file
     */
    this.formatSplitResults = function(results,original){
        jQuery("#results-container").remove();
        jQuery("#tabs-container").remove();
        jQuery("#save_scan").remove();
        jQuery("#"+self.target).append('<div id="tabs-container"></div>');
    // create the tabs menu
        var html = '<ul class="tabs-menu">'
        for ( var i=0;i<results.length;i++ )
        {
            var lay = (i==results.length-1)?"layer-final":"layer-"+(i+1);
            html += '<li';
            if ( i==0 )
                html +=' class="current"';
            html += '><a href="#'+lay+'">'+lay+'</a></li>';
        }
        html +='</ul>';
        // now format the results
        html += this.formatXML(results,original);
        jQuery("#tabs-container").append(html);
        var oPad = this.hPadding(jQuery("#original"));
        var lPad = this.hPadding(jQuery(".tab-content").first());
        jQuery("#original").width(jQuery("#original").width()-oPad);
        jQuery(".tab-content").width(jQuery(".tab-content").width()-lPad);
        var menuHt = jQuery(".tabs-menu").height();
        var tabsHt = jQuery(".tab-content").first().outerHeight();
        var origHt = jQuery("#original").outerHeight();
        // shrink to fit
        var tabsPos = Math.round(jQuery("#tabs-container").offset().top);
        var origPos = Math.round(jQuery("#original").offset().top);
        var gap = origPos - (tabsPos+menuHt+tabsHt);
        var remainHt = jQuery(window).height()-(tabsPos+menuHt+gap);
        var tPadHt = jQuery(".tab-content").outerHeight()-jQuery(".tab-content").height();
        var oPadHt = jQuery("#original").outerHeight()-jQuery("#original").height();
        tabsHt = Math.round(remainHt/2-tPadHt);
        jQuery(".tab-content").height(tabsHt);
        origHt = Math.round(remainHt/2-oPadHt);
        jQuery("#original").height(origHt);
        // activate tabs
        jQuery(".tabs-menu a").click(function(event) {
            event.preventDefault();
            jQuery(this).parent().addClass("current");
            jQuery(this).parent().siblings().removeClass("current");
            var tab = jQuery(this).attr("href");
            jQuery(".tab-content").not(tab).css("display", "none");
            jQuery(tab).fadeIn();
        });
    };
    /**
     * Get the height of NRows of the results table
    * @param nRows the number of rows to measure
     * @return the height of the first nRows of the table
     */
    this.measureNRows = function(nRows){
        var limit = 0;
        var htNRows = 0;
        jQuery("#results tbody tr").each(function(){
            htNRows += jQuery(this).height();
            if ( ++limit == nRows )
                return false;
        });
        return htNRows;
    };
    this.resultsHeaderHt = function(){
        return jQuery("#results-header th").outerHeight();
    };
    this.formatScanResults = function(results,original){
        jQuery("#results-container").remove();
        jQuery("#tabs-container").remove();
        jQuery("#save_split").remove();
        jQuery("#"+self.target).append('<div id="results-container"></div>');
        if ( results.length > 0 )
        {
            jQuery("#results-container").append('<table id="results-header"></table>');
            jQuery("#results-header").append('<thead><tr><th>Pattern</th><th>Context</th>'
            +'<th>Line</th><th>Layer</th><th>&nbsp;</th></tr></thead>');
            jQuery("#results-container").append(
                '<div id="results-wrapper"><table id="results"></table></div>');
            var table =jQuery("#results");
            var rows = "";
            for ( var i=0;i<results.length;i++ )
            {
                var row = '<tr><td>'+results[i].path+'</td>'
                    +'<td>'+results[i].context+'</td>'
                    +'<td>'+results[i].line+'</td>'
                    +'<td>'+self.rangeDropdown(0,self.maxLayer(results)+4,
                        Math.round(results[i].layer))+'</td>'
                    +'<td><a class="btn btn-danger" href="#" title="Delete row">'
                    +'<i class="fa fa-trash-o fa-lg"></i></a></td></tr>';
                rows += row;
            }
            table.append('<tbody>'+rows+'</tbody>');
        }
        else
            jQuery("#results-container").append('<p>No variant markup present!</p>');
        jQuery("#results-container").append(this.formatOriginalXML(original));
        var oPad = this.hPadding(jQuery("#original"));
        jQuery("#original").width(jQuery("#original").width()-oPad);
        if ( results.length > 0 )
        {
            // set height initially to five rows
            var tablePos = Math.round(jQuery("#tabs-content").offset().top);
            var nRows = 5;
            var htNRows = this.measureNRows(nRows);
            var resHt = this.resultsHeaderHt()+htNRows;
            var origPos = Math.round(jQuery("#original").offset().top);
            var gap = origPos - (resHt+tablePos);
            var remainHt = jQuery(window).height()-(tablePos+resHt+gap);
            // adjust height of table so we can see the original text
            while ( remainHt < htNRows )
            {
                nRows--;
                htNRows = this.measureNRows(nRows);
                resHt = this.resultsHeaderHt(nRows)+htNRows;
                remainHt = jQuery(window).height()-(tablePos+resHt+gap);
            }
            jQuery("#results-wrapper").height(htNRows);
            jQuery("#original").height(this.resultsHeaderHt()+htNRows);
            // set the width ofthe header cells
            for ( var i=0;i<5;i++ )
                self.setHeaderCellWidth(i);
            jQuery("#results-wrapper").css("top",jQuery("#results-header th").outerHeight()+"px");
        }
        jQuery("#save_scan").remove();
        jQuery("form p").append('<input type="button" value="save" id="save_scan"></input>');
        jQuery("#save_scan").click(function(){
            var docid = jQuery("#docid").val();
            var url = "http://"+window.location.hostname+"/splitter/update";
            var obj = {};
            var aborted = false;
            obj.docid = docid;
            var templates = Array();
            jQuery("#results tr").each(function(){
                var item = {};
                var lTd = jQuery(this).children("td:eq(3)");
                var lSelect = lTd.children("select");
                item.path = jQuery(this).children("td:eq(0)").text();
                item.layer = parseInt(lSelect.val());
                if ( item.layer == 0 )
                {
                    alert("Set the layer number to more than 0 for "+item.path);
                    aborted = true;
                    return false;
                }
                templates.push(item);
            });
            if ( !aborted )
            {
                obj.layers = JSON.stringify(templates);
                self.postObj(url,obj,
                    function(){jQuery("#results-container").remove();},
                    function(){alert("save failed")});
            }
        });
        // delete row
        jQuery(".btn-danger").click(function(e){
            jQuery(this).parents("tr").remove();
        });
    };
    var decoded = this.splitter_decode(udata);
    this.userdata = JSON.parse(decoded);
    var html ='<form target="response_frame" action="http://'+window.location.hostname+'/splitter/scan/" '
        +'method="post" enctype="multipart/form-data">'
        +'<p><select name="docid" id="docid"></select></input> '
        +' Sample: '
        +'<input name="file_upload" id="file_button" type="file"></input>'
        +'<input type="submit" disabled="disabled" id="scan_button" value="scan"></input>'
        +'<input type="submit" disabled="disabled" id="split_button" value="split"></input></p>'
        +'</form><iframe id="response_frame" name="response_frame"></iframe>';
    var targ = jQuery("#"+this.target);
    targ.append(html);
    this.buildProjectMenu();
    jQuery("#file_button").change(function(e){
        if ( jQuery(this).val().length > 0 )
        {
            jQuery("#scan_button").removeAttr("disabled");
            jQuery("#split_button").removeAttr("disabled");
            jQuery("#save_scan").remove();
            jQuery("#save_split").remove();
        }
        else
            jQuery("#scan_button").attr("disabled","disabled");
    });
    jQuery("#scan_button").click(function(){
        jQuery("form").attr("action","http://"+window.location.hostname+"/splitter/scan/");
    });
    jQuery("#split_button").click(function(){
        jQuery("form").attr("action","http://"+window.location.hostname+"/splitter/split/");
    });
    jQuery("#response_frame").load(function(e){
        var html ="";
        var text = jQuery(this).contents().text();
        if ( text.length>0 )
        {
            var jObj = JSON.parse(text);
            jQuery(".error").remove();
            if ( jObj.error != undefined )
            {
                jQuery("#tabs-container").empty();
                jQuery("#results-container").empty();
                if ( jObj.error==="OK" )
                    jQuery("#"+self.target).append('<p class="error">Saved</p>');
                else
                    jQuery("#"+self.target).append('<p class="error">Error: '+jObj.error+'</p>');
            }
            else if ( jObj.type=="scan" )
                self.formatScanResults(jObj.results,jObj.original);
            else if ( jObj.type == "split" )
            {
                //jQuery("#"+self.target).append(html);
                self.formatSplitResults(jObj.results,jObj.original);
                jQuery("#save_split").remove();
                jQuery("form p").append('<input type="submit" id="save_split" value="save"></button>');
                jQuery("#save_split").click(function(e){
                    jQuery("form").attr("action","http://"+window.location.hostname+"/splitter/layers/");
                });
            }
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
function getSplitterArgs( scrName )
{
    var params = new Object ();
    var module_params = jQuery("#splitter_params").val();
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
    var params = getSplitterArgs('splitter');
    jQuery("#"+params['mod-target']).css("visibility","hidden");
    var sp = new splitter(params['mod-target'],params['udata']);
});



