sts = {
  summaries: [],
  images: [],
  video: $('video')[0],
  summaryFile: "resources/HansRosling_summary.json",
  videoFile: "",
  videoFileI: 0,
  posterFile: "",
  thumbRes: {
    width: 87,
    height: 58,
  },
  prep: 0,
}

var getVidFile = function(){
  var vf = 'resources/' + sts.videoFile + sts.videoFileI + '.mp4';
  sts.videoFileI++;
  return vf;
}

var makeGroupRow = function(callback){
  var $gr = $('<div>').attr('class', 'row groupRow');
  var $gc = $('<div>').attr('class', 'col-md-12 groupContent');
  var $video = $('<video id="video'+sts.videoFileI+'" class="video" controls preload="auto" width="566px" height="312px" poster="'+sts.posterFile+'"> <source src="'+getVidFile()+'" type="video/mp4" /> </video>');
  $gr.append($gc);
  $gc.append($video);
  
  if (callback != undefined) {
    callback($gr, $gc, $video);
  } else {
    return $gc;
  }
}

var makeSection = function(image, caption, timestamp){
  var $s = $('<div>').attr('class', 'section').data('time', timestamp);
  var $k = $('<div>').attr('class', 'keyframe');
  var $c = $('<div>').attr('class', 'caption');
  $s.append($k);
  $s.append($c);
  $c.html(caption);
  $k.append(image);
  return $s;
}

var seekThenCaptureImgTimes = function(time_list, cap_list, i, callback) {

  var vid = sts.video;

  if (i < time_list.length) {
    // set current time to timelist
    vid.currentTime = time_list[i];
    // when the video has seeked to that time
    $(vid).one('seeked', function(){
      // make a capture
      var cap = {};
      cap.image_time = time_list[i];
      cap.image_id = randomId();

      cap.$image = $(capture())
        .attr('class', 'img-myThumbnail')
        .attr('id', cap.image_id);
      
      // add them to a global list
      cap_list.push(cap);

      // do it again
      seekThenCaptureImgTimes(time_list, cap_list, i+1, callback);
    });
  } else {
    console.log("Done capturing images.");
    callback(cap_list);
  }
};

var bindEnter = function(){
  $('body').on('keypress', function(k){
    if (k.keyCode === 13) {
      console.log(sts.video.currentTime);
    }
  })
};

var seekVideosToFirst = function(){
  $('.groupRow').each(function(){
    var time = $(this).find('.section').first().data('time');
    var vid = $(this).find('video')[0];
    vid.addEventListener("loadedmetadata", function(){
      vid.currentTime = time;
    });
  });
  $('.groupRow').first().find('video')[0].currentTime = 0;
}

var startSummaryLayout = function(){
  console.log("Loading video & group row");
  summaries = sts.summaries;
  makeGroupRow(function ($gr, $gc, $video) {
    $('body').append($gr);
    $video.on("loadedmetadata", function(){  
      sts.video = $video[0];
      bindEnter();
      console.log("Loaded video meta data!");

      var times = []
      for (var i = 0; i < Object.keys(sts.summaries).length; i++) {
        times.push(sts.summaries[Object.keys(sts.summaries)[i]].image_time);
      }

      seekThenCaptureImgTimes(times, [], 0, function(cl){
        var lastGroup = 0;
        for (var i = 0; i < cl.length; i++) {
          var entry = sts.summaries[Object.keys(sts.summaries)[i]];
          var $s = makeSection(cl[i].$image, entry.text, sts.summaries[Object.keys(sts.summaries)[i]].start_time);
          if (entry.group === lastGroup) {$gc.append($s) }
          else {
            $gc = makeGroupRow();
            $('body').append($gc.parent());
            $gc.append($s);
            lastGroup ++;
          }
        }

        $('.keyframe').click(function(){
          var time = $(this).parent().data('time');
          console.log($(this).parent().parent().find('video')[0]);
          console.log("Playing: "+time); 
          $(this).parent().parent().find('video')[0].currentTime = time;
          $(this).parent().parent().find('video')[0].play();
        });
        $('.groupRow').before(function(i){
            var h = $('<h3>').text(sts.titles[i]);
            return $('<div>').attr('class', 'groupHead row').append(h);
        });
        seekVideosToFirst();
        $('video').on('play', function(){
          var vID = $(this).attr('id');
          $('video').each(function(){
            if ($(this).attr('id') != vID) {
              this.pause();
            }
          });
        });
        // $('.keyframe').hover(function(){
        //   var dat = $(this).find('img').first().attr('src');
        //   nimage
        // });
        if (sts.summaryFile.indexOf('Extractive') > 0) {
          $('.caption').css('font-size', '10px');
        }

      });

    })
  });
}

var loadSummaries = function(){
  console.log("Loading summary");
  $.ajax({
    url: sts.summaryFile,
    async: false,
    dataType: 'json',
    success: function (response) {
      console.log(response);
      sts.summaries = response;
      sts.prep++;
      if (sts.prep == 2) {startSummaryLayout()};
    },
    error: function(e){
      console.log('Error occured when loading transcript');
      console.log(e);
    }
  });
};

var loadTitles = function () {
  $.ajax({
    url: 'resources/' + sts.args[1] + '_titles.json',
    async: false,
    dataType: 'json',
    success: function (response) {
      console.log(response);
      sts.titles=response;
      sts.prep++;
      if (sts.prep == 2) {startSummaryLayout()};
    },
    error: function(e){
      console.log('Error occured when loading titles');
      console.log(e);
    }
  });
};

sts.url = document.URL;
sts.args = document.URL.split('?=').slice(1);
sts.summaryFile = 'resources/' + sts.args[0] + '_summary.json';
sts.videoFile = sts.args[1];
sts.posterFile = 'resources/' + sts.args[2] + '_poster.png';
loadSummaries();
loadTitles();
