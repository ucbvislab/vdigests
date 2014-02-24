var colors = ['rgb(247,252,240)','rgb(224,243,219)',
'rgb(204,235,197)','rgb(168,221,181)',
'rgb(123,204,196)','rgb(78,179,211)',
'rgb(43,140,190)','rgb(8,104,172)','rgb(8,64,129)'];


function randomid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

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

var getSelectedSpans = function(){
    if (window.getSelection) { // non-IE
        userSelection = window.getSelection();
        rangeObject = userSelection.getRangeAt(0);
        if (rangeObject.startContainer == rangeObject.endContainer) {
            return [rangeObject.startContainer.parentNode.id];
        } else {
            return getAllBetween(
                rangeObject.startContainer.parentNode,
                rangeObject.endContainer.parentNode);
        }
    } else if (document.selection) { // IE lesser
        userSelection = document.selection.createRange();
        var ids = new Array();
        
        if (userSelection.htmlText.toLowerCase().indexOf('span') >= 0) {
            $(userSelection.htmlText).filter('span').each(function(index, span) {
                ids.push(span.id);
            });
            return ids;
        } else {
            return [userSelection.parentElement().id];
        }
    }
};


// HOW TO HIGHLIGHT GIVEN RANGE: http://jsfiddle.net/8mdX4/
function getTextNodesIn(node) {
    var textNodes = [];
    if (node.nodeType == 3) {
        textNodes.push(node);
    } else {
        var children = node.childNodes;
        for (var i = 0, len = children.length; i < len; ++i) {
            textNodes.push.apply(textNodes, getTextNodesIn(children[i]));
        }
    }
    return textNodes;
}

function setSelectionRange(el, start, end) {
    if (document.createRange && window.getSelection) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var textNodes = getTextNodesIn(el);
        var foundStart = false;
        var charCount = 0, endCharCount;

        for (var i = 0, textNode; textNode = textNodes[i++]; ) {
            endCharCount = charCount + textNode.length;
            if (!foundStart && start >= charCount && (start < endCharCount || (start == endCharCount && i < textNodes.length))) {
                range.setStart(textNode, start - charCount);
                foundStart = true;
            }
            if (foundStart && end <= endCharCount) {
                range.setEnd(textNode, end - charCount);
                break;
            }
            charCount = endCharCount;
        }

        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (document.selection && document.body.createTextRange) {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(true);
        textRange.moveEnd("character", end);
        textRange.moveStart("character", start);
        textRange.select();
    }
}

function makeEditableAndHighlightScale(color, data) {
    sel = window.getSelection();
    if (sel.rangeCount && sel.getRangeAt) {
        range = sel.getRangeAt(0);
    }
    document.designMode = "on";
    if (range) {
        sel.removeAllRanges();
        sel.addRange(range);
    }
    
    // get which ids are in the selection
    var ids = getSelectedSpans();
    // string together the ids for selection
    $.each(ids, function(i,v){
        // select id
        var $span = $('#'+v);
        //update color value
        var colorIndex = $span.data('colorInd');
        $span.data('colorInd', colorIndex + 1);
        // add user to data
        var users = $span.data('users');
        users.push(data.user);
        $span.data('users', users);
        //update color
        $span.css('background-color', colors[$span.data('colorInd')]);
    });

    document.designMode = "off";
}



function highlight(color, data) {
    var range, sel;
    if (window.getSelection) {
        // IE9 and non-IE
        if (data != undefined && data.sequential) {
            makeEditableAndHighlightScale(color, data);
        } else {
            makeEditableAndHighlight(color);
        }
        
    } else if (document.selection && document.selection.createRange) {
        // IE <= 8 case
        range = document.selection.createRange();
        range.execCommand("BackColor", false, color);
    }
}

function makeEditableAndHighlight(color) {
    sel = window.getSelection();
    if (sel.rangeCount && sel.getRangeAt) {
        range = sel.getRangeAt(0);
    }
    document.designMode = "on";
    if (range) {
        sel.removeAllRanges();
        sel.addRange(range);
    }
    // Use HiliteColor since some browsers apply BackColor to the whole block
    if (!document.execCommand("HiliteColor", false, color)) {
        document.execCommand("BackColor", false, color);
    }
    document.designMode = "off";
}

function selectAndHighlightRange(id, start, end, data) {
    setSelectionRange(document.getElementById(id), start, end);
    if (data != undefined && data.sequential) {
        highlight("yellow", data);
    } else {
        highlight("yellow")
    }
    
    
}

function spanExistingWordsAndReturn(id, suffix) {
    var words = $("#" + id).find('p').text().split(" ");
    // put everything in a span
    $("#" + id).find('p').empty();
    $.each(words, function(i, v) {
        $("#" + id).find('p').append($("<span>")
            .attr('id', i+'w'+suffix)
            .data('colorInd', 0)
            .data('users', [])
            .text(v));
        $("#" + id).find('p').append($("<span>")
            .attr('id', i+'s'+suffix)
            .data('colorInd', 0)
            .data('users', [])
            .text(" "));
    });
    return words;
}

function appendColorKey(id) {
    var $p = $('#' + id).append($('<p>'));
    for (var i = 0; i < colors.length; i++) {
        $p.append($("<span>")
            .text(" " + i + " ")
            .attr('class', 'key')
            .css('background-color', colors[i]))
            
            .data("index", i);
    }
}

function colorZero(id) {
    $('#' + id).find('p').children().css('background-color', colors[0])
}

// takes id, start and end list, and submission range
function selectAndHighlightSubmissions(id, words, startEndList, subRange) {
    var startEndListStr = [];
    for (var i = 0; i < startEndList.length; i++) {
        startEndListStr.push(startEndList[i]+"");
    };

    if (subRange != undefined) {
        startEndList = startEndList.slice(subRange[0], subRange[1])
    }

    //console.log("Data for "+ 6 + " submission(s).");

    for (var sub = 0; sub < startEndList.length; sub++) {
        for (var i = 0; i < startEndList[sub].length; i++) {
            selectAndHighlightRange(id, 
                startEndList[sub][i][0], 
                startEndList[sub][i][1],
                {sequential: true, user: sub});
        };
    };
    
}

function currentSetup() {
    var paragraphNumber = parseInt(location.search.split("=")[1]);
    var submissions = [];
    if (location.href.indexOf("summarize") > -1) {
        submissions = response.extract;
    } else if (location.href.indexOf("find") > -1) {
        submissions = response.find;
    }
    colorZero('paragraph');
    var words = spanExistingWordsAndReturn('paragraph');
    selectAndHighlightSubmissions("paragraph", 
        words, 
        submissions, 
        [6*response.paragraphNumbers.indexOf(paragraphNumber),
        6*response.paragraphNumbers.indexOf(paragraphNumber)
        + response.responsesPerParagraph]);
    appendColorKey('paragraph');

}


// get start and end indicies of characters within selection
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