package edu.mit.nlp.segmenter.dp;

import java.util.*;
import java.io.*;
import edu.mit.nlp.segmenter.*;
import edu.mit.nlp.MyTextWrapper;
import edu.mit.util.JacobUtil;
/**
   Wraps the dynamic programming Bayesian segmenter {@link edu.mit.nlp.segmenter.dp.DPSeg},
   so that it can be called by {@link SegTester}
**/
public class BayesWrapper extends SegDurParametrizable {
    public BayesWrapper(){
        dispersion = 10;
        prior = .005;
        is_windowing_enabled = false;
        learned_params = null;
    }
    public void initialize(String config_filename){
        Properties props = new Properties();
        try {
            props.load(new FileInputStream(config_filename));
            is_windowing_enabled = SegTesterParams.getBoolProp(props,"use-fixed-blocks",false);
            prior = SegTesterParams.getDoubleProp(props,"dirichlet-prior",.005);
            dispersion = SegTesterParams.getDoubleProp(props,"segmentation-dispersion",10);
            num_segs_known = SegTesterParams.getBoolProp(props,"num-segs-known",true);
            em_params = SegTesterParams.getBoolProp(props,"em-param-search",false);
            use_duration = SegTesterParams.getBoolProp(props,"use-duration",true);
            if (debug){
                out.println(String.format("windowing: %b\tprior: %.3f\tdispersion %.3f",is_windowing_enabled, prior, dispersion));
            }
        } catch (Exception e){
            e.printStackTrace();
        }
    }
    public List[] segmentTexts(MyTextWrapper[] texts, int[] num_segs){
        String message = "BayesWrapper is out of date due to its handling of durations.  Use HBayesWrapper instead.  This should be fixed by using the duration package rather than computing duration probabilities in here.";
        out.println(message);
        System.err.println(message);

        List[] hyps = new List[texts.length];
        DPDocument[][] all_docs = new DPDocument[texts.length][1];
        int[][] tru_segs = new int[texts.length][];
        for (int i = 0; i < hyps.length; i++){
            all_docs[i][0] = I2JInterface.makeDPDoc(texts[i]);
            if (debug) out.println
                           (String.format("sentences: %d segments: %d",
                                          (int) all_docs[i][0].T(),
                                          num_segs[i]));
            if (num_segs[i] > 0){
                tru_segs[i] = new int[num_segs[i]];
                
                for (int j = 0; j < num_segs[i]; j++) tru_segs[i][j] = j+1;
            } else {tru_segs[i] = new int[1]; tru_segs[i][0] = 1; }
            
            if (debug) out.println("NUM SENTS: "+all_docs[i][0].T());
        }
        DPSeg dpseg = new DPSeg(all_docs,tru_segs);
        dpseg.setPrintStream(out);
        dpseg.m_debug = debug;
        dpseg.m_num_segments_known = num_segs_known;
        dpseg.use_duration = use_duration;
        
        if (!em_params) dpseg.segment(new double[]{Math.log(prior),Math.log(dispersion)});
        else {
            dpseg.segEM(new double[]{Math.log(prior),Math.log(dispersion)});
            learned_params = dpseg.getParams();
        }

        int[][] ihyps = dpseg.getResponses();
        for (int i = 0; i < hyps.length; i++){
            hyps[i] = I2JInterface.makeIgorList(ihyps[i],texts[i], is_windowing_enabled);
            if (is_windowing_enabled) {
                hyps[i] = MinCutSeg.convertWindow2SentenceSegmentation(hyps[i], texts[i]);
            }
            if (debug) out.println("ref: "+texts[i].getReferenceSeg()+"\tseg: "+hyps[i]);
        }
        return hyps;                 
    }

    public double[] getParams() {
        if (em_params) return learned_params;
        return new double[]{Math.log(prior), Math.log(dispersion)};
    }

    public boolean is_windowing_enabled;
    public double dispersion;
    public double prior;
    public boolean num_segs_known;
    public boolean em_params = false;
    public boolean use_duration;
    protected double[] learned_params; //log prior will be first, log dispersion will be last
}
