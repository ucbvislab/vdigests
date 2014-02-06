// find
var param = {
	number : 0,
	transcript : "",
	ids : [], 
	divId : "paragraph",
	registerId : "registerSelection",
	outputId: "output",
	outputSectionId: "outputSection",
	submitId : "submit",
	clearId : "clear",
};

function alertSelection() {
    var mainDiv = document.getElementById(param.divId);
    var sel = getSelectionCharOffsetsWithin(mainDiv);
}

$(document).ready(function(){
	$('#' + param.outputSectionId).hide();

	$('#' + param.clearId).click(function(){
		$('#' + param.outputSectionId).hide();
		$('#' + param.outputId).val("Recorded");
		$('#' + param.divId).find('p').children().css('background-color','white');
	});

	$('#' + param.submitId).click(function(){
		$('#' + param.outputSectionId).show();
	});

	var layoutParagraph = function(trans){
		var text = param.transcript[param.number].line;
		var words = text.split(' ');

		var $p = $(document.createElement('p')).text(text);

		$('#' + param.divId).append($p);
	};
    
    var setupHandlers = function(){
    	$("#"+param.registerId).click(function(){
    		selectAndHighlightRange(param.divId, param.sel.start, param.sel.end);
    		var newVal = $('#' + param.outputId).val() 
    			+ ',' + param.sel.start
    			+ ':' + param.sel.end;

    		$('#' + param.outputId).val(newVal);

    		document.getSelection().removeAllRanges();
    	});

    	$(document).mouseup(function(){
    		var mainDiv = document.getElementById(param.divId);
    		var sel = getSelectionCharOffsetsWithin(mainDiv);
    		param.sel = sel;
    	});
    };
    

	$.ajax({
	  dataType: "json",
	  url: "../resources/HansRosling_transcript.json",
	  data: "hi",
	  success: function(response){
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