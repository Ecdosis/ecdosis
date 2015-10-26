function comparer( target, docid, modpath )
{
    this.target = target;
    this.modpath = modpath;
    this.docid = docid;
    this.title = "Untitled";
    // don't link with these ids
    this.banned = {};
    /** timeoutId for clearning scrolling flag */
    this.timeoutId = 0;
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
                $("#version"+id).change( function(){
                    // reload the versions
                    var id = "#version"+id;
                    if ( id == "#version1" )
                        self.version1 = $("#version1").val();
                    else
                        self.version2 = $("#version2").val();
                    // set content for left hand side
                    self.getTextVersion(self.version1,
                        self.version2,"deleted","leftColumn");
                    // set content for rhs
                    self.getTextVersion(self.version2,
                        self.version1,"added","rightColumn");
                    });
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
     * @param diffKind "deleted" or ChunkState.ADDED
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
                    this.banned = {};
                    self.buildLeftScrollTables();
                    self.buildRightScrollTables();
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
        while ( pos1 >= 0 && pos2 > 0 && pos1 < pos2 )
        {
            if ( !this.cssAlreadyAdded )
            {
                // skip "<!--styles: "
                css = body.substring( 12+pos1, pos2 );
                // add extracted CSS to head
                $("head style").last().after(
                    '<style type="text/css">'
                    +css+'</style>');
            }
            var p1 = body.substring( 0, pos1 );
            var p2 = body.substring( pos2+3 );
            body = p1+p2;
            pos1 = body.indexOf("<!--styles: ");
            pos2 = body.indexOf("-->",pos1+12);
            this.cssAlreadyAdded = true;
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
     * Set a timeout for when we reset the this.scroller field
     */
    this.setScrollTimeout = function() {
        if ( this.timeoutId == 0 )
            this.timeoutId = window.setTimeout(function(){
                self.scroller=undefined;
                self.timeoutId = 0;
                self.leftScrollTop = $("#leftColumn").scrollTop();
                self.rightScrollTop = $("#rightColumn").scrollTop();
            // this should be fairly coarse-grained
            // the shortest time for switching between scroll-sides
            }, 300);
    };
    /**
     * Coordinate the scrolling of the two panels
     */
    this.synchroScroll = function()
    {
	    var leftDiv = $("#leftColumn");
        var leftTop = leftDiv.scrollTop();
        var rightDiv = $("#rightColumn");
        var rightTop = rightDiv.scrollTop();
        if ( rightTop != self.rightScrollTop )
        {
            if (self.scroller==undefined||self.scroller=="right")
            {
                var leftOffset = 0;
                self.scroller = "right";
                var rIndex = self.findHighestIndex(self.rightOffsetsToIds,
                    rightTop+rightDiv.height()/2);
                if ( rIndex == -1 )
                    leftOffset = 0;
                else
                {
                    var rightId = self.rightOffsetsToIds[rIndex].id;
                    var leftId = "d"+rightId.substr(1);
                    // find offset of left id
                    leftOffset = self.leftIdsToOffsets[leftId]-leftDiv.height()/2;
                    if ( leftOffset < 0 )
                        leftOffset = 0;
                }
                self.leftScrollTop = leftOffset;
                self.rightScrollTop = rightTop;
                leftDiv.scrollTop(leftOffset);  
                self.setScrollTimeout();  
            }
            else
                console.log("ignoring left scroll")
        }
        if ( leftTop != self.leftScrollTop )
        {
            if (self.scroller==undefined||self.scroller=="left")
            {
                var rightOffset = 0;
                self.scroller = "left";
                var lIndex = self.findHighestIndex(self.leftOffsetsToIds,
                    leftTop+leftDiv.height()/2);
                if ( lIndex == -1 )
                    rightOffset = 0;
                else
                {
                    var leftId = self.leftOffsetsToIds[lIndex].id;
                    var rightId = "a"+leftId.substr(1);
                    // find offset of right id
                    rightOffset = self.rightIdsToOffsets[rightId]-rightDiv.height()/2;
                    if ( rightOffset < 0 )
                        rightOffset = 0;
                }
                self.rightScrollTop = rightOffset;
                self.leftScrollTop = leftTop;
                rightDiv.scrollTop(rightOffset); 
                self.setScrollTimeout(); 
            }
            else
                console.log("ignoring right scroll")
        }
        // wait until one side stabilises
    }
    /**
     * Look for spans with an id attribute set
     * @param elem the element to search from
     * @param hash the hashtable to store the id->offset key-value
     * @param index the sorted offset array giving us the id
     */
    this.findIds = function( elem, hash, index ) {
        if ( elem[0] == undefined )
            console.log("undefined");
        if ( elem[0].nodeName == "SPAN"
	        && elem.attr('id') != undefined )
        {
	        var idAttr = elem.attr('id');
            var spanOffset;
            if ( elem.css("display")=="none" ||elem.parent().css("display")=="none" )
            {
                var topOff = elem.offset().top;
                this.banned[idAttr] = topOff;
                if ( idAttr.charAt(0)=='a' )
                    this.banned['d'+idAttr.substr(1)] = topOff;
                else
                    this.banned['a'+idAttr.substr(1)] = topOff;
            }
            else if ( this.banned[idAttr] == undefined )
                spanOffset = elem.offset().top;
	        hash[idAttr] = spanOffset;
            index.push( {offset: spanOffset, id: idAttr} );
            //console.log("found "+idAttr);
        }
        else if ( elem.children().length > 0 )
	        this.findIds( elem.children().first(), hash, index );
        if ( elem.next().length > 0 )
	        this.findIds( elem.next(), hash, index );
    };
    /**
     * Find the highest offset in a sorted list of {offset, id} objects
     * @param list the list of objects
     * @param value the value which should be just a bit less or equal
     * @return the index of the item just a bit bigger than value
     */
    this.findHighestIndex = function( list, value )
    {
        var top = 0;
        var bot = list.length-1;
        var mid=0;
        while ( top <= bot )
        {
            mid = Math.floor((top+bot)/2);
            if ( value < list[mid].offset )
            {
                if ( mid == 0 )
                {
                    // value < than first item
                    return -1;
                }
                else
                    bot = mid-1;
            }
            else    // value >= list[mid].loc
            {
                if ( mid == list.length-1 )
                    // value is >= last item
                    break;
                else if ( value >= list[mid+1].offset )
                    top = mid+1;
                else // list[mid] must be biggest <= value
                    break;
            }
        }
        //console.log("value="+value+" mid="+mid);
        return mid;
    }
    /**
     * Sort a list of {offset,id} objects by offset
     * @param a the array
     */
    this.sortOffsets = function(a) {
        for (var h = a.length; h = parseInt(h/2);) {
            for (var i = h; i < a.length; i++) {
                var k = a[i];
                for (var j = i; j >= h && k.offset < a[j-h].offset; j -= h)
                    a[j] = a[j-h];
                a[j] = k;
            }
        };
        return a;
    }
    this.buildLeftScrollTables=function(){
        var lhs = $("#leftColumn");
        lhs.scrollTop(0);
        this.leftScrollTop = 0;
        this.leftIdsToOffsets = {};
        this.leftOffsetsToIds = new Array();
        this.findIds( lhs.children().first(), this.leftIdsToOffsets, this.leftOffsetsToIds );
        this.sortOffsets( this.leftOffsetsToIds );
/*        for ( var i=0;i<50;i++ )
            console.log("left:"+this.leftOffsetsToIds[i].offset+" "+this.leftOffsetsToIds[i].id);*/
    };
    this.buildRightScrollTables=function(){
        var rhs = $("#rightColumn");
        rhs.scrollTop(0);
        this.rightScrollTop = 0;
        this.rightIdsToOffsets = {};
        this.rightOffsetsToIds = new Array();
        this.findIds( rhs.children().first(), this.rightIdsToOffsets, this.rightOffsetsToIds );
        this.sortOffsets( this.rightOffsetsToIds );
/*        for ( var i=0;i<50;i++ )
            console.log("right:"+this.rightOffsetsToIds[i].offset+" "+this.rightOffsetsToIds[i].id);*/
        // wait unti both lists are loaded 
        // this should be fairly fine-grained
        setInterval(this.synchroScroll,50);
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

