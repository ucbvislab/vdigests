# 
# PySceneDetect - Scene Detection with Python and OpenCV
# Part 1: Threshold/Fade-to-Black Detection
#
# By Brandon Castellano - http://www.bcastell.com
#
# This Python program implements a simple threshold-based scene detection
# algorithm using using a set threshold, printing the timecodes and frame
# numbers where fades-in from, # and fades-out to black are detected. This
# program depends on the Python OpenCV bindings.  Visit the following URL
# to find the next part of this tutorial:
#
# http://www.bcastell.com/tech-articles/pyscenedetect-tutorial-part-1/
#
# Copyright (C) 2013 Brandon Castellano.  I hereby release this file into
# the public domain.
#


import sys
import cv2
import time

def main():
    if len(sys.argv) < 2:
        print "Error - file name must be specified as first argument."
        return
    
    cap = cv2.VideoCapture()
    cap.open(sys.argv[1])
    
    if not cap.isOpened():
        print "Fatal error - could not open video %s." % sys.argv[1]
        return
    else:
        print "Parsing video %s..." % sys.argv[1]
        
    # Do stuff with cap here.

    width  = cap.get(cv2.cv.CV_CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.cv.CV_CAP_PROP_FRAME_HEIGHT)
    print "Video Resolution: %d x %d" % (width, height)

    # Allow the threshold to be passed as an optional, second argument to the script.
    threshold = 15
    if len(sys.argv) > 2 and int(sys.argv[2]) > 0:
        threshold = int(sys.argv[2])
    print "Detecting scenes with threshold = %d.\n" % threshold

    last_mean = 0       # Mean pixel intensity of the *last* frame we processed
    frames = []

    times = []
    count = 0

    while True:
        (rv, im) = cap.read()   # im is a valid image if and only if rv is true

        if not rv:
            break
        if cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES) not in frames:
            frame_mean = im.mean()

            # Detect fade in from black.
            if frame_mean >= threshold and last_mean < threshold:
                print "Detected fade in at %dms (frame %d)." % (
                    cap.get(cv2.cv.CV_CAP_PROP_POS_MSEC),
                    cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES) )

            # Detect fade out to black.
            elif frame_mean < threshold and last_mean >= threshold:
                print "Detected fade out at %dms (frame %d)." % (
                    cap.get(cv2.cv.CV_CAP_PROP_POS_MSEC),
                    cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES) )
            
            last_mean = frame_mean      # Store current mean to compare in next iteration.


        elif cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES) in frames:
            break

    frame_count = cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES)    # position in video in frames
    print "Read %d frames from video." % frame_count

    cap.release()

    
if __name__ == "__main__":
    main()