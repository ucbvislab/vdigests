var videoId = 'video';

var thumbnail = {
  height: 75,
  width: 75 * (455/300),
  imgtype: 'png'
}

var settings = {

};

var makeSummary = function(json) {
  for (var i = 0; i < json.length; i++) {

    var $row = $(document.createElement("div")).attr("class", "row");
    var $pic = $(document.createElement("div"))
      .attr("class", "col-md-3 keyframe")
      .data("time", json[i].start)
      .on("click", function(){
        var $video = $('#'+videoId)[0];
        $video.currentTime = $(this).data('time');
        $video.play();
      });
    var $cap = $(document.createElement("div")).attr("class", "col-md-9 summary");

    $cap.append($(document.createElement("p")).text(json[i].text));

    $pic.append($(document.createElement("img")).attr("src", json[i].img));

    $row.append($pic);
    $row.append($cap);

    $("#clips").append($row);
  };
};

$('#input').on("keypress", function(e){
  if (e.keyCode === 13) {
    var t = $('#input').val();
    var json = JSON.parse(t);
    json.sort(function(a,b){return a.start-b.start});
    j = json;
    $('#input').remove();
    makeSummary(json);
  }
});