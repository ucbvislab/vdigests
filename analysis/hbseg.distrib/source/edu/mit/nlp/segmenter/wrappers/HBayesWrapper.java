package edu.mit.nlp.segmenter.wrappers;

import edu.mit.nlp.segmenter.hierarchical.*;
import edu.mit.nlp.MyTextWrapper;
import edu.mit.nlp.segmenter.*;
import java.util.List;
import java.util.ArrayList;
import java.io.PrintStream;

/**
   wraps HBayesSegEM as a single-level segmenter
   for comparative evaluation

 **/

public class HBayesWrapper extends SegDurParametrizable {
    public HBayesWrapper(){
        segmenter = new HBayesSegLSVB();
        //segmenter = new HBayesSegEM();
    }
    public void setPrintStream(PrintStream out){
        segmenter.setPrintStream(out);
        super.setPrintStream(out);
    }
    public void initialize(String config_filename){
        segmenter.initialize(config_filename);
        super.initialize(config_filename);
        try {
            m_params = new SegTesterParams(new java.io.File(config_filename));
        } catch (Exception e){
            e.printStackTrace();
        }
    }
    //hmm.  hafta create HTextWrappers for each text.  we'll just
    //so what's happening is that GreedySeg is getting htextwrappers
    //and then taking subsegments.  but its way of doing that is flakey.
    //anyway, I should not have to call
    public List[] segmentTexts(MyTextWrapper[] texts, int[] num_segs){
        HTextWrapper[] htexts = new HTextWrapper[texts.length];
        for (int i = 0; i < htexts.length; i++){
            htexts[i] = new HTextWrapper(texts[i]);
            //ok what's happening here is that in re-reading these
            //texts, we're losing the fact that we wanted only a subsegment
            //i wonder if this is really necessary?
            //we also need to set their reference segmentations
            List<List> refsegs = new ArrayList<List>();
            refsegs.add(texts[i].getReferenceSeg());
            htexts[i].setRefSeg(refsegs);
        }
        segmenter.setTexts(htexts,1);
        HSegmentation[] hsegs = segmenter.segmentTexts();
        List[] output = new List[texts.length];
        for (int i = 0;i < hsegs.length; i++){
            output[i] = hsegs[i].getLevel(0);
        }
        return output;
    }
    public void setDebug(boolean debug){
        this.debug = debug;
        segmenter.setDebug(debug);
    }

    public void setDurationModel(List<Integer>[] durs){
        List[][] durmodel = new List[durs.length][1];

        for (int i = 0; i < durs.length; i++){
            durmodel[i][0] = durs[i];
            if (debug) System.out.println
                           (String.format("d%d: %s",i,durs[i]));
        }
        segmenter.setDurationModel(durmodel);
    }

    double[][] r;
    HSegmenter segmenter;
    SegTesterParams m_params;
    
}
