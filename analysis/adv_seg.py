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
from cs_config import CONFIG_FILE_DIR, OUTDATA_DIR, TRAINING_DATA_DIR

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
    os.chdir("/Users/cjrd/Dropbox/ContentSegmentation/code/hbseg.distrib")
    # run the experiment
    exp_cmd = "python ../add_initial_segments.py %(initsegsize)d %(tfile)s |java -cp %(cp)s edu.mit.nlp.segmenter.SegTester -config %(config)s"\
              % {"cp": CPATH, "config": cfile, "tfile": tfile, "initsegsize": 5}
    print 'starting', exp_cmd
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


def run_exps(method):
    os.chdir("/Users/cjrd/Dropbox/ContentSegmentation/code/hbseg.distrib")
    # get the input text from stdin (expect ==== separated text) TODO explore why this is the case
    indata_files = glob.glob(os.path.join(TRAINING_DATA_DIR, "*.txt"))
    indata_files = map(lambda x: os.path.split(x)[-1], indata_files)

    ref_ends = []
    for dfile in indata_files:
        # TODO add a descriptive title to the output
        odata = read_ui_fmt_data(os.path.join(TRAINING_DATA_DIR, dfile))
        ref_seg_txt = odata['ref_seg_txt']
        ref_ends.append(get_ref_endings(ref_seg_txt).tolist())
    dsets = zip(indata_files, ref_ends)
    rtime = datetime.datetime.fromtimestamp(time.time()).strftime('%Y%m%d%H%M%S')

    # BAYESSEG RUN PARAMETERS
    if method == "bseg":
        params = {
            "random-seed": ["1"],
            "use-choi-style-boundaries": ["true"],
            "stop-words": ["config/STOPWORD.list"],
            "use-word-stems": ["true"],
            "segmentation-dispersion": ["10"],  # no effect?
            "initializer": ["edu.mit.nlp.segmenter.RandomSegmenter"],
            "max-burnin-temp": ["0.5", "1"],  # also tried 0.5 and 1
            # this is key
            "segmenter": ["edu.mit.nlp.segmenter.mcmc.CuCoSeg"],  # matters
            "chi-squared-analysis": ["false"],  # only for cue words...
            # this is what's learned from em
            "dirichlet-prior": ["0.2"],  # , ".1", "0.3", "0.4"],
            # "dirichlet-prior-range": [".0001,.1,20,M"],
            # "window-size-range": ["10,25,16,A"],
            "remove-stop-words": ["true"],  # "false"],
            "window-size": ["5", "10"],  # , "1", "5", "20"],  # a "true" param
            "use-fixed-blocks": ["false"],  # TODO true causes out of memory error...
            "num-segs-known": ["false"],  # TODO fails if false???
            # em parameters already plugged in...
            "em-param-search": ["true"],  # "true param" MATTERS
            "use-duration": ["false"],  # , "true"],
            ##### MCMC PARAMS
            "careful-debug": ["false"],
            "phi-b-0": [".01"],
            "phi-o-0": [".005"],
            "lambda-b": ["1"],
            "lambda-o": ["0"],
            "mcem-cuephrases": ["false"],  # NO LONGER SUPPORTED?
            "num-mcmc-moves": ["50000"],
            "max-move": ["50", "100"],  # MATTERS
            "update-params-period": ["100", "200"],  # MATTERS (100 works well)
            "output-period": ["10000"],
            "burnin-duration": ["0.1", "0.2"],  # MATTERS "0.1", "0.25", "0.5"],  # ".1", "0.5"],
            "max-burnin-temp": ["5", "10"],  # , # MATTERS "1", "10"],
            "cooling-duration": ["0.1", "0.2"],  # MATTERS ["0.1", "0.15", "0.2", "0.25", "0.4"]
            "update-lm-period": ["100"],  # "50", "500"], DOESNT MATTER WITH MCMC
            "cuephrase-file": ["config/CUEPHRASES.hl"],
            "use-extra-features": ["false"],  # no effect
        }
    elif method == "mcs":
        params = {
            # "min-segment-length-range": ["0,3,4,A"],
            "edge-cutoff": ["70", "120", "160"],  # MATTERS
            "count-smoothing-alpha": ["0.8", "1.1", "1.4"],  # MATTERS
            # "count-smoothing-alpha-range": ["0.0,2.0,41,A"],
            "stop-words": ["config/STOPWORD.list"],
            "use-choi-style-boundaries": ["true"],
            "num-segs-known": ["false"],  # TODO fails if false???
            # "edge-cutoff-range": ["70,300,47,A"],
            "use-word-stems": ["true"],  # done in advance
            "segmenter": ["edu.mit.nlp.segmenter.wrappers.MCSWrapper"],
            "count-smoothing-horizon": ["1", "5", "10"],  # MATTERS
            "tfidf-segment-split": ["10", "15", "25"],  # MATTERS
            # "window-size-range": ["10,25,16,A"],  # doesn't matter'
            "remove-stop-words": ["false"],  # done in advance
            "enable-edge-cutoff": ["true"],
            # "window-size": ["25"],  # doesn't matter'
            # "max-burnin-temp": ["1"],
            "min-segment-length": ["1"],  # doesn't seem to have an effect
            "use-tfidf-weighting": ["true", "false"],  # MATTERS
            # "count-smoothing-horizon-range": ["1,3,3,A"],
            "use-count-smoothing": ["true"],
            "use-fixed-blocks": ["false"],  # BREAKS
            "enforce-min-segment-length": ["true"],
            # "tfidf-segment-split-range": ["10,30,21,A"],
        }
    else:
        raise Exception("method " + method + " is not supported")

    # find params with more than one value and do grid search
    mult_keys = [pi[0] for pi in params.items() if len(pi[1]) > 1]

    print mult_keys
    all_psets = gen_grid_dicts(params)
    for use_params in all_psets:

        hendings = []
        scores = []
        outdata_name = method + "_" + rtime  + ".json"
        outdata_file = OUTDATA_DIR + outdata_name
        rtime = datetime.datetime.fromtimestamp(time.time()).strftime('%Y%m%d%H%M%S')
        # set the config file
        config_file_name = os.path.join(CONFIG_FILE_DIR, rtime  + ".config")
        while os.path.exists(config_file_name):
            config_file_name = os.path.join(CONFIG_FILE_DIR, rtime  + ".config")
        with open(config_file_name, "w") as cfile:
            for param in use_params:
                cfile.write(param + "=" + use_params[param] + "\n")

        for dataset in dsets:
            # grab the relevant shorthands
            indata_file = dataset[0]
            ref_ending = dataset[1]

            # run the experiment
            exp_cmd = "cat %(ddir)s%(suff)s |java -cp %(cp)s edu.mit.nlp.segmenter.SegTester -config %(config)s"\
                      % {"cp": CPATH, "ddir": TRAINING_DATA_DIR, "config": config_file_name, "suff": indata_file}
            print 'starting', exp_cmd
            try:
                resout = subprocess.check_output(exp_cmd, shell=True)
            except:
                print "FAILED: ", exp_cmd
                continue
            print resout
            resarr = resout.split("\n")
            hendings.append(sorted(list(set(ast.literal_eval(resarr[-2])))))
            try:
                scores.append(get_seg_scores(ref_ending, hendings[-1]))
            except:
                ipdb.set_trace()
            print scores[-1]

        # need to combine scores and maintain original and  sentence segments, etc
        tcomp = float(sum([x["ncomp"] for x in scores]))
        tpk = sum([x["pk"] * x["ncomp"] for x in scores]) / tcomp
        twd = sum([x["wd"] * x["ncomp"] for x in scores]) / tcomp

        print "\n\n---------------"
        print tpk, twd
        print "---------------\n\n"

        with open(outdata_file, "w") as outfile:
            try:
                json.dump(
                    {
                        "method": method,
                        "dsets": dsets,
                        "params": use_params,
                        "all_scores": scores,
                        "segments": hendings,
                        "tpk": tpk,
                        "twd": twd,
                        "cmd": exp_cmd,
                        "date": rtime
                    },
                    outfile)
            except:
                ipdb.set_trace()

if __name__ == "__main__":
    if len(sys.argv) == 2:
        run_exps(sys.argv[-1])
    elif len(sys.argv) == 4:
        eval_text(sys.argv[2], sys.argv[3])
    else:
        print "Expected formats:\npython adv_seg.py (bseg|mcs)\npython adv_seg.py eval cfile.config tfile.txt"
