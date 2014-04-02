var videoId = 'video';

var thumbnail = {
  height: 75,
  width: 75 * (455/300),
  imgtype: 'png'
}

function getURIformcanvas() {
  var ImageURItoShow = "";
  var canvasFromVideo = document.getElementById("imageView");
  if (canvasFromVideo.getContext) {
     var ctx = canvasFromVideo.getContext("2d"); // Get the context for the canvas.canvasFromVideo.
     var ImageURItoShow = canvasFromVideo.toDataURL("image/png");
  }
  var imgs = document.getElementById("imgs");

  var $row = $(document.createElement("div")).attr("class", "row");
  var $pic = $(document.createElement("div"))
    .attr("class", "col-md-3 keyframe")
    .data("time", $('#'+videoId)[0].currentTime)
    .on("click", function(){
      var $video = $('#'+videoId)[0];
      $video.currentTime = $(this).data('time');
      $video.play();
    });
  var $cap = $(document.createElement("div")).attr("class", "col-md-9 summary");

  $cap.append($(document.createElement("textarea")).attr("class", "form-control"));

  $pic.append(
    Canvas2Image.convertToImage(
      canvasFromVideo, 
      thumbnail.width, 
      thumbnail.height,
      thumbnail.imgtype)
  );

  $row.append($pic);
  $row.append($cap);

  $("#clips").append($row);
}

function capture() {
  var video = document.getElementById(videoId);

  var canvasDraw = document.getElementById('imageView');
  var w = canvasDraw.width;
  var h = canvasDraw.height;
  var ctxDraw = canvasDraw.getContext('2d');

  ctxDraw.clearRect(0, 0, w, h);

  ctxDraw.drawImage(video, 0, 0, w, h);
  ctxDraw.save();
  getURIformcanvas();	 
}

function export_config() {
  var out = {}
  var vid_file = $('#'+videoId+' source').attr('src');
  var vid_type = $('#'+videoId+' source').attr('type');
  out.source = {file: vid_file, file_type: vid_type}; 
  out.summary = [];

  $('.keyframe').each(function(){
    var time = $(this).data('time');
    var text = $(this).next().text();
    var image = $(this).find('img').attr('src');
    out.summary.push({ 
      time: time, 
      text: text,
      image: image
    });   
  });

  var str_json = JSON.stringify(out);
  var $div = $(document.createElement('div')).attr("class", "row").css("padding-top", "20px");
  var $textarea = $(document.createElement('textarea')).attr("class", "form-control").text(str_json);
  $('.container').append($div.append($textarea));

}

$(window).keypress(function(e) {
    if (e.which === 96) {
        var summary = $('textarea').val();
        var $summary = $('textarea').parent();
        $summary.html('');
        $summary.append($(document.createElement('p')).text(summary));
    }
});
