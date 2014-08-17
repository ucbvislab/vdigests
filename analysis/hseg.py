import sys
import json
import subprocess
import os
import ast
import copy
import numpy as np
from adv_seg import eval_text

fname = sys.argv[-1]
indata = json.load(open(fname, 'r'))
tmpfile = "/tmp/" + fname.split("/")[-1]

CPATH = "classes:lib/jdom.jar:lib/colt.jar:lib/lingpipe-3.4.0.jar:lib/MinCutSeg.jar:lib/mtj.jar:lib/options.jar:lib/log4j-1.2.14.jar"
cfile = "/Users/cjrd/Dropbox/ContentSegmentation/data/experiments_configs/best_bayes.config"

# build the text
with open(tmpfile, 'w') as outfile:
    for i in xrange(len(indata)):
        outfile.write(indata[str(i)]["text"][0]+"\n")

hendings = eval_text(cfile, tmpfile)

# break apart the segments that are too long

sct = 0
output = {}
for i in xrange(len(indata)):
    if i >= hendings[sct]:
        sct += 1
    val = copy.deepcopy(indata[str(i)])
    val["group"] = sct
    output[str(i)] = val
print json.dumps(output)
