import json
import sys
import glob
import os

inf_dir = sys.argv[1]

for jfile in glob.iglob(os.path.join(inf_dir, "*json")):
    intm_chaps = {}
    injson = json.load(open(jfile, "r"))
    for skey in injson:
        insec = injson[skey]
        sec = {
            "start": insec["start_time"],
            "end": insec["end_time"],
            "thumbnail": {
                "time": insec["image_time"]
            },
            "summary": insec["text"]
        }
        chgrp = insec["group"]
        if chgrp in intm_chaps:
            intm_chaps[chgrp]["sections"].append(sec)
        else:
            intm_chaps[chgrp] = {
                "title": insec["group_title"],
                "sections": [sec]
            }
    # sort the sections
    for chnum in intm_chaps:
        intm_chaps[chnum]["sections"].sort(lambda x, y: int(1000 * (x["start"] - y["start"])))
        intm_chaps[chnum]["start"] = intm_chaps[chnum]["sections"][0]["start"]
        intm_chaps[chnum]["end"] = intm_chaps[chnum]["sections"][-1]["end"]
    outchaps = sorted(intm_chaps.values(), key=lambda x: x["start"])
    # add the start and end time to the chapters
    json.dump(outchaps, open(jfile + "-trans", "w"))
