import sys
SMARKER = "=========="
infile = sys.argv[-1]
AVG_LINES_PER_SEG = int(sys.argv[-2])

with open(infile, 'r') as ofile:
    flines = ofile.readlines()
    for i, line in enumerate(flines):
        if i % AVG_LINES_PER_SEG == 0:
            print SMARKER
        print line.strip()
    print SMARKER
