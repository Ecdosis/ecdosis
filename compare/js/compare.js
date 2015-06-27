function comparer( target, docid, modpath )
{
    this.target = target;
    this.modpath = modpath;
    this.docid = docid;
    this.title = "Untitled";
    /** the vertical scroll positions of the two panels */
    this.leftScrollPos;
    this.rightScrollPos;
    /** used to compute the closest span to a given vertical position */
    this.scrolledDiff;
    /** the closest span element to a given vertical position */
    this.scrolledSpan;
    /** the fixed div to which the other one aligns itself */
    this.fixedDiv;
    /** the div being aligned to fixedDiv */
    this.scrolledDiv;
    var self = this;
    /**
     * Get a list menu
     * @param version1 the version to use as the default
     * @param name the name and ID of the list
     * @param onchange a javascript function to call on list change
     * @param longNameId ID of long name
     * @param parent the id of the enclsing div to add it to
     */
    this.getList = function( version1, name, longNameId, parentId )
    {
        var url = "http://"+window.location.host+"/compare/list";
        url += "?docid="+this.docid;
        url += "&name="+name;
        url += "&version1="+version1;
        url += "&style=list/twin-list";
        url += "&long_name_id="+longNameId;
        jQuery.get( url, function(data) 
        {    
            if ( data != undefined && data.length > 0 )
            {
                $("#"+parentId).prepend( data );
                // replace popup description with selected version name
                id = longNameId.substr("long_name".length,longNameId.length);
                var desc = $("#long_name"+id);
	            desc.text($("#version"+id+" :selected").attr("title"));
            }
        })
        .fail(function() {
            console.log("failed to load version list");
        });
    }
    /**
     * Get a text version
     * @param v1 the first version
     * @param v2 the second version
     * @param diffKind ChunkState.DELETED or ChunkState.ADDED
     * @param parentId the idof the enclosing parent element
     */ 
    this.getTextVersion = function( v1, v2, diffKind, parentId )
    {
        var url = "http://"
            +window.location.hostname
            +"/compare/"
        url +="?docid="+this.docid;
        url += "&version1="+v1;
        url += "&version2="+v2;
        url += "&diff_kind="+diffKind;
        jQuery.get( url, function(data) 
        {    
            if ( data != undefined && data.length > 0 )
            {
                $("#"+parentId).prepend(self.extractCSSFromBody(data) );
                if ( parentId == "rightColumn" )
                {
                    self.fitWithinParent("leftColumn");
                    self.fitWithinParent("rightColumn");
                    self.fitWithinParent("twinCentreColumn");
                }
            }
        })
        .fail(function() {
            console.log("failed to load text version");
        });
    }
    /**
     * Get the next version based on version1
     * @param version1 the first version to get the next of
     */
    this.getNextVersion = function( version1 ) {
        var url = "http://"
            +window.location.hostname
            +"/compare/version2";
        url += "?docid="+this.docid;
        url += "&version1="+version1;
        jQuery.get( url, function(data) 
        {    
            if ( data != undefined && data.length > 0 )
            {
                self.version2 = data;
                self.getList( self.version2, "version2", 
                    "long_name2", "rightWrapper" );
                // set content for left hand side
                self.getTextVersion(self.version1,
                    self.version2,"deleted","leftColumn");
                // set content for rhs
                self.getTextVersion(self.version2,
                    self.version1,"added","rightColumn");
            }
        })
        .fail(function() {
            console.log("failed to get next version");
        });
    }
    /**
     * Get the first version of the cortex
     */
    this.getVersion1 = function() {
        $.get( "/compare/version1?docid="+docid, 
            function( data ) {
                self.version1 = data;
                self.getDocTitle();
         })
        .fail( function() {
            alert("failed to get version 1");
        });
    };
    /**
     * Get the document's metadata title
     * @return a string being the MVD's description
     */
    this.getDocTitle = function() {
        $.get( "/compare/title?docid="+docid, 
            function( data ) {
                self.title = data;
                $("#top").prepend( data );
                self.getList(self.version1, 
                    "version1", "long_name1", "leftWrapper" );
                self.getNextVersion( self.version1 );
         })
        .fail( function() {
            alert("failed to get version 1");
        });
    }
    /**
     * Get the numeric value of a css dimension
     * @param dimen a dimension like "30px"
     * @return its numeric value
     */
    this.valueOf = function(dimen) {
        var value = 0;
        for ( var i=0;i<dimen.length;i++ )
        {
            var token = dimen[i];
            if ( token >= '0' && token <= '9' )
            {
                value *= 10;
                value += token - '0';
            }
            else
                break;
        }
        return value;
    };
    /**
     * Scan the body returned by the formatter for the relevant CSS
     * @param body the body returned by a call to formatter
     * @return the doctored body
     */
    this.extractCSSFromBody = function( body ) {
        var css = null;
        var pos1 = body.indexOf("<!--styles: ");
        var pos2 = body.indexOf("-->",pos1+12);
        if ( pos1 >= 0 && pos2 > 0 && pos1 < pos2 )
        {
            // skip "<!--styles: "
            css = body.substring( 12+pos1, pos2 );
            // add extracted CSS to head
            $("head style").last().after(
                '<style type="text/css">'
                +css+'</style>');
            var p1 = body.substring( 0, pos1 );
            var p2 = body.substring( pos2+3 );
            body = p1+p2;
        }
        return body;
    };
    /**
     * Scale a div to its parent's size (or just use 100%?)
     */
    this.fitWithinParent = function( id ) {
	    var elem = $("#"+id);
        var topOffset = elem.offset().top;
	    var windowHeight = $(window).height();
	    // compute the height, set it
	    var vPadding = this.valueOf(elem.css("padding-top"))
		    +this.valueOf(elem.css("padding-bottom"));
	    var vBorder = this.valueOf(elem.css("border-top-width"))
		    +this.valueOf(elem.css("border-bottom-width"));
	    var tempHeight = windowHeight-(topOffset+vPadding+vBorder);
	    elem.height(tempHeight);
    };
    /**
     * Coordinate the scrolling of the two panels
     */
    this.synchroScroll = function()
    {
	    // 1. find the side that has scrolled most recently
	    // and the side that has probably remained static
	    var leftDiv = $("#leftColumn");
	    var rightDiv = $("#rightColumn");
	    if ( leftDiv.scrollTop() != self.leftScrollPos )
	    {
		    self.leftScrollPos = leftDiv.scrollTop();
		    self.scrolledDiv = leftDiv;
		    self.staticDiv = rightDiv;
	    }
	    else if ( self.rightScrollPos != rightDiv.scrollTop() )
	    {
		    self.rightScrollPos = rightDiv.scrollTop();
		    self.scrolledDiv = rightDiv;
		    self.staticDiv = leftDiv;
	    }
	    else	// nothing to do
		    return;
	    // 2. find the most central span in the scrolled div
	    self.scrolledDiff = 4294967296;
	    self.scrolledSpan = null;
	    var scrolledDivTop = self.scrolledDiv.offset().top;
	    var staticDivTop = self.staticDiv.offset().top;
	    var centre = self.scrolledDiv.height()/2
		    +self.scrolledDiv.scrollTop();
	    self.findSpanAtOffset( self.scrolledDiv, centre, scrolledDivTop );
	    // 3. find the corresponding span on the other side
	    if ( self.scrolledSpan != null )
	    {
		    var staticId = self.scrolledSpan.attr("id");
		    if ( staticId.charAt(0)=='a' )
			    staticId = "d"+staticId.substring(1);
		    else
			    staticId = "a"+staticId.substring(1);
		    var staticSpan = $("#"+staticId );
		    if ( staticSpan != undefined )
		    {
			    // 4. compute relative topOffset of scrolledSpan
			    var scrolledTopOffset = self.scrolledSpan.offsetTop()
				    -scrolledDivTop;
			    // 5. compute relative topOffset of staticSpan
			    var staticTopOffset = staticSpan.offsetTop()-staticDivTop;
			    // 6. scroll the static div level with scrolledSpan
			    var top = staticTopOffset-self.staticDiv.height()/2;
			    if ( top < 0 )
				    self.staticDiv.scrollTop(0);
			    else
				    self.staticDiv.scrollTop(top);
		    }
	    }
    }
    /**
     * Find the closest span to a given offset
     */
    this.findSpanAtOffset = function( elem, pos, divOffset ) {
	    if ( elem[0].nodeName == "span"
		    && elem.getAttribute('id') != null )
	    {
		    var idAttr = elem.getAttribute('id');
		    var spanRelOffset = elem.offsetTop-divOffset;
		    if ( Math.abs(spanRelOffset-pos) < self.scrolledDiff )
		    {
			    self.scrolledSpan = elem;
			    self.scrolledDiff = Math.abs(spanRelOffset-pos);
		    }
	    }
	    else if ( elem.firstChild != null )
		    self.findSpanAtOffset( elem.firstChild, pos, divOffset );
	    if ( elem.nextSibling != null )
		    self.findSpanAtOffset( elem.nextSibling, pos, divOffset );
    };
    /**
     * Build the content of this view
     */
    this.build = function()
    {
        // first build the framework
        var form = $('<form id="default" action="/compare"></form>').prependTo("#"+this.target);
        form.attr("name", "default" );
        form.attr( "method", "post" );
        var divCentre = $('<div id="twinCentreColumn"></div>').prependTo(form);
        var hidden = $('<input id="docid" type="hidden"></input>').insertBefore("#twinCentreColumn");
        hidden.attr("name","docid");
        hidden.attr("value",this.docid);
        $('<div id="rightColumn"></div>').prependTo(divCentre);
        $('<div id="leftColumn"></div>').prependTo(divCentre);
        // top div contains title and two drop-downs
        var divTop = $('<div id="top"></div>').prependTo(divCentre);
        // add a row containing the two dropdowns
        var right = $('<div><div id="leftWrapper"></div></div>').prependTo(divTop);
        right.append('<div id="rightWrapper"></div>');
        // now fill it - sets off cascade of functions
        this.getVersion1();
    };
    this.build();
    setInterval(this.synchroScroll,500);
}
/**
 * This reads the "arguments" to the javascript file
 * @param scrName the name of the script file minus ".js"
 * @return a key-value map of the parameters
 */
function get_args( scrName )
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
/**
 * Load the compare tool with three arguments
 */
jQuery(document).ready(
    function(){
        var params = get_args('compare');
        new comparer(params['target'],
            params['docid'],params['modpath']);
    }
);

