import numpy as np
import cv2
import sys

def main():
    if len(sys.argv) < 2:
        print "Error - file name must be specified as first argument."
        return
    
    cap = cv2.VideoCapture(sys.argv[1])
    
    if not cap.isOpened():
        print "Fatal error - could not open video %s." % sys.argv[1]
        return
    else:
        print "Parsing video %s..." % sys.argv[1]

	while(cap.isOpened()):
	    ret, frame = cap.read()

	    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

	    cv2.imshow('frame',gray)
	    if cv2.waitKey(1) & 0xFF == ord('q'):
	        break

	cap.release()
	cv2.destroyAllWindows()

if __name__ == "__main__":
    main()