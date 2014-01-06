// find
var param = {
	number : 0,
	transcript : "",
	ids : [], 
	divId : "paragraph",
	registerId : "registerSelection"
};

// HOW TO HIGHLIGHT GIVEN RANGE: http://jsfiddle.net/8mdX4/ 
function getSelectionCharOffsetsWithin(element) {
    var start = 0, end = 0;
    var sel, range, priorRange;
    if (typeof window.getSelection != "undefined") {
        range = window.getSelection().getRangeAt(0);
        priorRange = range.cloneRange();
        priorRange.selectNodeContents(element);
        priorRange.setEnd(range.startContainer, range.startOffset);
        start = priorRange.toString().length;
        end = start + range.toString().length;
    } else if (typeof document.selection != "undefined" &&
            (sel = document.selection).type != "Control") {
        range = sel.createRange();
        priorRange = document.body.createTextRange();
        priorRange.moveToElementText(element);
        priorRange.setEndPoint("EndToStart", range);
        start = priorRange.text.length;
        end = start + range.text.length;
    }
    return {
        start: start,
        end: end
    };
}

function alertSelection() {
    var mainDiv = document.getElementById(param.divId);
    var sel = getSelectionCharOffsetsWithin(mainDiv);
    alert(sel.start + ": " + sel.end);
}

$(document).ready(function(){

	var layoutParagraph = function(trans){
		var text = param.transcript[param.number].line;
		var words = text.split(' ');

		var $p = $(document.createElement('p'));

		for (var i = 0; i < words.length; i++) {
			var $spanW = $(document.createElement('span')).attr('id', i+'w').data('sw', 'w');
			var $spanS = $(document.createElement('span')).attr('id', i+'s').data('sw', 's');
			$spanW.text(words[i]);
			$spanS.text(' ');
			$p.append($spanW); 
			$p.append($spanS);
		};

		$('#' + param.divId).append($p);
	};
    
    var setupHandlers = function(){
    	$("#"+param.registerId).click(function(){
    		document.getSelection().removeAllRanges();
    		$('#'+param.ids.join(",#"))
    			.css('background-color', 'yellow');

    	});

    	// http://jsfiddle.net/KC48j/11/
	    var getAllBetween = function (firstEl,lastEl) {
	        var firstElement = $(firstEl); // First Element
	        var lastElement = $(lastEl); // Last Element
	        var collection = new Array(); // Collection of Elements
	        collection.push(firstElement.attr('id')); // Add First Element to Collection
	        $(firstEl).nextAll().each(function(){ // Traverse all siblings
	            var siblingID  = $(this).attr('id'); // Get Sibling ID
	            if (siblingID != $(lastElement).attr('id')) { // If Sib is not LastElement
	                collection.push($(this).attr('id')); // Add Sibling to Collection
	            } else { // Else, if Sib is LastElement
	                collection.push(lastElement.attr('id')); // Add Last Element to Collection
	                return false; // Break Loop
	            }
	        });         
	        return collection; // Return Collection
	    }
	    
	    $(document).mouseup(function(event){
	    	var ids = [];

	        if (window.getSelection) { // non-IE
	            userSelection = window.getSelection();
	            rangeObject = userSelection.getRangeAt(0);
	            if (rangeObject.startContainer == rangeObject.endContainer) {
	                ids = [rangeObject.startContainer.parentNode.id];
	            } else {
	               	ids = getAllBetween(
	                    rangeObject.startContainer.parentNode,
	                    rangeObject.endContainer.parentNode);
	            }
	        } else if (document.selection) { // IE lesser
	            userSelection = document.selection.createRange();
	            
	            if (userSelection.htmlText.toLowerCase().indexOf('span') >= 0) {
	                $(userSelection.htmlText).filter('span').each(function(index, span) {
	                    ids.push(span.id);
	                });
	            } else {
	                ids = [userSelection.parentElement().id];
	            }
	        }

	        param.ids = ids;
	    });
    };
    

	$.ajax({
	  dataType: "json",
	  url: "../resources/HansRosling_transcript.json",
	  data: "hi",
	  success: function(response){
	  	console.log(response);
	  	if (location.search.split("=").length < 1) {
	  		console.log("url.html?p=[paragraphNumber]");
	  		console.log("Using Default: " + param.number);
	  	} else {
	  		param.number = parseInt(location.search.split("=")[1]);
	  	}
	  	param.transcript = response;

	  	layoutParagraph(response);
	  	setupHandlers();
	  }
	});
});