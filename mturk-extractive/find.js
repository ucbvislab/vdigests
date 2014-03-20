// find
param = {
	number: 0,
	transcript : "",
	ids : [], 
	divId : "paragraph",
	registerId : "registerSelection",
	outputId: "output",
	outputSectionId: "outputSection",
	submitId : "submit",
	clearId : "clear",
	transFile: "resources/HansRosling_transcript.json",
	$textsource: $('#textsource'),
	example: 'resources/example.html',
	words: 0,
	paragraphs: 0,
};

function getTransFile(name) {
	return 'resources/' + name + '_transcript.json';
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

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
		param.paragraphs++;
		var text = param.transcript[param.number].line;
		var words = text.split(' ');
		console.log(words.length);
		param.words += words.length;
		if (param.words < 200 || (param.words >= 200 && param.paragraphs == 1)) {
			var $p = $(document.createElement('p')).text(text);
			$('#' + param.divId).append($p);
		}
		
		if (param.words < 100) {
			param.number+=1;
			layoutParagraph(trans);
		}
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
    
    if (location.search.split("=").length <= 1) {
		console.log("url.html?p=[paragraphNumber]");
		console.log("Using Default: " + param.number);
  	} else {
  		param.number = parseInt(location.search.split("=")[1].split('?')[0]);
  	}

  	if (location.search.split("=").length < 3) {
		console.log("url.html?p=[paragraphNumber]?t=[transcriptName]");
		console.log("Using Default: " + param.transFile);
  	} else {
  		param.transFile = getTransFile(location.search.split("=")[2].split('?')[0]);
  	}


  	if (location.search.indexOf('true') > -1) {
  		$.ajax({
		  dataType: "html",
		  url: param.example,
		  data: "hi",
		  success: function(response){
		  	$('#example').html("<h4>Example Text <small>The user has selected one phrase in this short example. The phrase is contained within one sentence.</small></h4>" + response);
		  	$('#example').hide();
		  	$('#showexample').click(function(){
		  		$(this).hide();
		  		$('#example').show();
		  	});
		  },
		  error: function(e){
		  	console.log(e);
		  }
		});
  	}

  	$.ajax({
  		dataType: "json",
  		url: "resources/sources.json",
  		data: "hi",
  		success: function(response){
  			var s = response[location.search.split("=")[2].split('?')[0]];
  			$('#textsource').attr('href', s);
  		}
  	})

	$.ajax({
	  dataType: "json",
	  url: param.transFile,
	  data: "hi",
	  success: function(response){
	  	
	  	param.transcript = response;

	  	layoutParagraph(response);
	  	setupHandlers();
	  }
	});
});