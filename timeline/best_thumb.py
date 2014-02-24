# CV_CAP_PROP_FPS
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
import math

def main():
	if len(sys.argv) < 4:
	    print "Error - please specify video_filename height width"
	    return

	total_height = float(sys.argv[2])
	total_width = float(sys.argv[3])

	cap = cv2.VideoCapture()
	cap.open(sys.argv[1])

	if not cap.isOpened():
	    print "Fatal error - could not open video %s." % sys.argv[1]
	    return
	else:
	    print "Parsing video %s..." % sys.argv[1]

	# hopefully frame count works
	frame_count = int(cap.get(cv2.cv.CV_CAP_PROP_FRAME_COUNT))

	width  = float(cap.get(cv2.cv.CV_CAP_PROP_FRAME_WIDTH))
	height = float(cap.get(cv2.cv.CV_CAP_PROP_FRAME_HEIGHT))

	# divide the total height by the height each thumbnail
	# will be with the given total_width
	# math.ceil always goes for more (longer, narrower)

	thumb_count = 2*int(math.ceil(total_height/((width/height)*total_width)))
	thumb_per_frames = int(math.ceil(float(frame_count)/float(thumb_count)))
	print "Thumbnails: ", thumb_count
	print "One thumbnail per ", thumb_per_frames, " frames."


	print "Video Resolution: %d x %d" % (width, height)

	last_mean = 0 # Mean pixel intensity of the *last* frame we processed
	frames = []

	best_options = []
	current_count = 0
	current_option = {'intensity': 0, 'position': 0, 'time': 0}
	done = False

	while not done:
		(rv, im) = cap.read() # im is a valid image if and only if rv is true
		if not rv:
		    break

		frame_position = cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES)
		frame_time = cap.get(cv2.cv.CV_CAP_PROP_POS_MSEC)
		frame_intensity = im.mean() 

		if current_count % 500 is 0:
			print "On frame: ", frame_position

		#if we're still choosing the same thumbnail
		if current_count < thumb_per_frames:
			

			if current_option['intensity'] < frame_intensity\
			and frame_intensity < 250:
				current_option['position'] = frame_position
				current_option['intensity'] = frame_intensity
				current_option['time'] = frame_time
		# time to record the best option for the set, and move
		# to next thumbnail
		else: 
			current_count = 0

			# print the best option
			print current_option
			best_options.append(current_option)

			# update current option with first frame of sequence
			current_option['position'] = frame_position
			current_option['intensity'] = frame_intensity
			current_option['time'] = frame_time
		current_count += 1

		if frame_position > frame_count - 1:
			done = True

	frame_count = cap.get(cv2.cv.CV_CAP_PROP_POS_FRAMES)    # position in video in frames
	print "Read %d frames from video." % frame_count
	print "All best options: ", best_options

	cap.release()

    
if __name__ == "__main__":
    main()