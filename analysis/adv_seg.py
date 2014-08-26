import sys
import glob
from tempfile import NamedTemporaryFile
import numpy as np
import ipdb
import json
import ast
import os
import datetime
import time
import subprocess

from cutils import read_ui_fmt_data, get_ref_endings, get_seg_scores


CPATH = "classes:lib/jdom.jar:lib/colt.jar:lib/lingpipe-3.4.0.jar:lib/MinCutSeg.jar:lib/mtj.jar:lib/options.jar:lib/log4j-1.2.14.jar"


def gen_grid_dicts(params):
    """
    very memory-inefficient way to do a grid search
    """
    mult_keys = [pi[0] for pi in params.items() if len(pi[1]) > 1]
    all_psets = []

    # base pset
    bpset = {}
    for key in params:
        bpset[key] = params[key][0]
    all_psets.append(bpset)

    toadd_psets = []
    # TODO use yield
    for chkey in mult_keys:
        for i, chkey_val in enumerate(params[chkey]):
            if i == 0:
                # already present
                continue
            # add change to all existing parameters sets
            for pset in all_psets:
                apset = pset.copy()
                apset[chkey] = chkey_val
                toadd_psets.append(apset)
        all_psets += toadd_psets
        toadd_psets = []
    return all_psets


def eval_text(cfile, tfile):
    """
    Evaluate given text with a given config file
    Arguments:
    - `cfile`: config file
    - `tfile`: text file to be evaluated
    """
    os.chdir("hbseg.distrib")
    # run the experiment
    exp_cmd = "python ../add_initial_segments.py %(initsegsize)d %(tfile)s |java -cp %(cp)s edu.mit.nlp.segmenter.SegTester -config %(config)s"\
              % {"cp": CPATH, "config": cfile, "tfile": tfile, "initsegsize": 5}
    print 'starting', exp_cmd
    ipdb.set_trace()
    resout = subprocess.check_output(exp_cmd, shell=True)
    resarr = resout.split("\n")
    hendings = sorted(list(set(ast.literal_eval(resarr[-2]))))
    dvals = np.diff([0] + hendings)
    lends = len(hendings)
    outends = []
    i = 0
    while i < lends:
        if dvals[i] > 2:
            outends.append(hendings[i])
            i += 1
        else:
            if i < 2:
                # we're at the start

                if i < lends - 2:
                    dvals[i + 1] += 1
                else:
                    outends.append(hendings[i])
                i += 1
            elif i >= lends - 2:
                # we're at the end
                if i < 2:
                    outends[i - 1] = hendings[i]
                else:
                    outends.append(hendings[i])
                i += 1
            elif dvals[i + 1] < 3:
                # string of < 3's
                ns_len = 0
                while i < lends and dvals[i] < 3:
                    ns_len = 1
                    i += 1
                dvals[i - 1] = ns_len
                outends.append(hendings[i - 1])
            else:
                # which adjoining segment is smaller?
                if dvals[i - 1] < dvals[i + 1]:
                    outends[-1] = hendings[i]
                else:
                    dvals[i + 1] += dvals[i]
                i = i + 1

    # post-hoc removal of single sentences TODO: greedily add to the neighbor that results in the highest likelihood

    print "-----\n", outends, "\n-----\n"
    return outends

if __name__ == "__main__":
    if len(sys.argv) == 2:
        pass
        # run_exps(sys.argv[-1])
    elif len(sys.argv) == 4:
        eval_text(sys.argv[2], sys.argv[3])
    else:
        print "Expected formats:\npython adv_seg.py (bseg|mcs)\npython adv_seg.py eval cfile.config tfile.txt"
