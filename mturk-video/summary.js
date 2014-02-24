var ids = {
	paragraph: 'paragraph',
	video: 'video',
	videoStart: 'videoStart'
}

function State() {
	this.pIndex = null;
	this.pStartTime = null;
	this.pEndTime = null;
	this.$paragraph = $(document.createElement('p'));
	this.transcript = null;
	this.video = $('#'+ids.video)[0];
	this.videoLoaded = false;
}

var state = new State();

State.prototype.videoTime = function() {
	return this.video.currentTime;
}

State.prototype.generateHit = function() {
	var t = "";
	var state = this;
	var filtered = state.transcript.filter(function(d,i){
		return d.speaker == state.pIndex;
	})
	state.pStartTime = filtered[0].start;
	state.pEndTime = filtered[filtered.length - 1].end;
	// add the paragraph words to t
	for (var i = 0; i < filtered.length; i++) {
		t += filtered[i].word + " ";
	};

	state.$paragraph.text(t);

	$('#' + ids.paragraph).append(state.$paragraph);

	var start = state.pStartTime;
	state.video.pause();
	
	state.video.addEventListener("loadedmetadata", function(){
		state.video.currentTime = start;
	});

	state.video.addEventListener("timeupdate", function(){
    	if(this.currentTime >= state.pEndTime) {
        	this.pause();
    	}
	});

	
}



// load json with aligned transcript

// parse url to determine which paragraph should be shown

// link aligned transcript to points in the video
var parser = document.createElement('a');
parser.href = document.URL;
// encode paragraph in URL with ex: ?paragraph=1
state.pIndex = parseInt(parser.search.split('=')[1]);

$.ajax({
	async: false,
	url: 'resources/HansRosling_aligned.json',
	dataType: 'json',
	success: function(response){
		state.transcript = response.words;
		state.generateHit(response);
	}
});
