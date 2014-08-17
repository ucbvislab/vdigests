import numpy as np
# from seg_eval import pk, windowdiff


def get_seg_scores(ref_endings, hyp_endings):
    pass
#     """
#     TODO write doctests
#     """

#     if not isinstance(ref_endings, np.ndarray):
#         ref_endings = np.array(ref_endings)
#     if not isinstance(hyp_endings, np.ndarray):
#         hyp_endings = np.array(hyp_endings)

#     # reference translation
#     ref_trans = np.zeros(ref_endings[-1])
#     ref_trans[ref_endings - 1] = 1
#     ref_trans = "".join(map(lambda x: str(int(x)), ref_trans.tolist()))

#     # hypothesis translation
#     hyp_trans = np.zeros(hyp_endings[-1])
#     hyp_trans[hyp_endings - 1] = 1
#     hyp_trans = "".join(map(lambda x: str(int(x)), hyp_trans.tolist()))

#     # evaluation
#     k = int(round(len(ref_trans) / (ref_trans.count("1") * 2.)))
#     pkval = pk(ref_trans, hyp_trans, k)
#     wd = windowdiff(ref_trans, hyp_trans, k)
#     return {"pk": pkval, "wd": wd, "k": k, "ncomp": len(ref_trans) - k + 1}


def get_ref_endings(seg_text):
    """
    :param seg_text - [seg1, seg2, ...] where segi = [sent1, sent2, ...] and senti is a string
    :type array of array of strings
    """
    return np.cumsum(map(lambda x: len(x), seg_text))


def read_ui_fmt_data(fpath):
    """
    """
    odata = open(fpath, 'r').readlines()
    # TODO make providing the true segs an option
    ref_seg_txt = []
    cur_seg = []
    dlines = []
    for s in odata:
        if s[:4] == "====":
            if len(cur_seg):
                ref_seg_txt.append(cur_seg)
                cur_seg = []
        else:
            cur_seg.append(s)
            dlines.append(s)
    return {
        "ref_seg_txt": ref_seg_txt,
        "dlines": dlines
    }
