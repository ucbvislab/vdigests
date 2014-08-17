import sys
from nltk.tokenize.punkt import PunktSentenceTokenizer
from pymongo import MongoClient
import ipdb

client = MongoClient("mongodb://localhost:27017")
db = client.vdigest
vdigests = db.vdigests


def add_sents(invid=None):
    if invid:
        findObj = {"_id": invid}
    else:
        findObj = {}
    for vd in vdigests.find(findObj):
        if not vd.get("nSentences") and vd.get('alignTrans') and vd.get('alignTrans').get('words'):
            twords = vd['alignTrans']['words']
            twords_len = len(twords)
            trans = " ".join([wrd["word"] for wrd in twords])
            STokenizer = PunktSentenceTokenizer()
            token_sents = STokenizer.sentences_from_text(trans)
            cwct = 0
            sentct = 0
            curword = twords[cwct]
            for tsent in token_sents:
                tswords = tsent.split(" ")
                for wnum, tsword in enumerate(tswords):
                    if tsword == curword["word"]:
                        curword["sentenceNumber"] = sentct
                        cwct += 1
                        if cwct < twords_len:
                            curword = twords[cwct]
                    else:
                        print "warning: not a one-to-one match: ", curword["word"], tsword
                        if wnum == 0:
                            curword["sentenceNumber"] = sentct - 1
                            cwct += 1
                            if cwct < twords_len:
                                curword = twords[cwct]
                        elif wnum == len(tswords) - 1:
                            curword["sentenceNumber"] = sentct
                        else:
                            ipdb.set_trace()
                sentct += 1
            vd['nSentences'] = len(token_sents)
            # write the separated sentences to file
            ssout_name = "ss-" + vd["_id"]
            outf = open("../ffdata/rawtrans/" + ssout_name, 'w')
            outf.write("\n".join(token_sents))
            outf.close()
            vd['sentSepTransName'] = ssout_name
            vdigests.save(vd)

if __name__ == "__main__":
    nargs = len(sys.argv)
    if nargs == 1:
        add_sents()
    elif nargs == 2:
        add_sents(sys.argv[-1])
    else:
        print "usage: python add_sentences [vid]"
    
