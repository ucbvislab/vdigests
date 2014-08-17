package edu.mit.nlp.segmenter.hierarchical;

import java.io.PrintStream;
import java.io.FileInputStream;
import java.util.Properties;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import edu.mit.util.JacobUtil;
import edu.mit.nlp.segmenter.Segmenter;
import edu.mit.nlp.segmenter.SegTesterParams;
import edu.mit.nlp.segmenter.SegDurParametrizable;
import edu.mit.nlp.segmenter.wrappers.HBayesWrapper;
import java.lang.reflect.Method;

/**
   Builds a hierarchical segmenter by applying a linear segmenter in 
   a top-down fashion, first segmenting at the top level, then at each
   lower level.  

   You specify the base segmenter in the config file.
 **/
public class GreedySegmenter extends HSegmenter {
    public GreedySegmenter(){
    }

    public void initialize(String config_filename){
        Properties props = new Properties();
        super.initialize(config_filename);
        try {
            props.load(new FileInputStream(config_filename));
            k_base_segmenter_name = props.getProperty("base-segmenter",k_base_segmenter_name);
            
            base_segmenter = (Segmenter) Class.forName(k_base_segmenter_name).
                 getConstructor(new Class[]{}).newInstance(new Object[]{});        
            if (debug) out.println("greedy calling initializer for base");
            base_segmenter.initialize(config_filename);
            base_segmenter.setPrintStream(out);

            local_edurs = SegTesterParams.getBoolProp(props,"local-edurs",false);

            //fancier reflection way to do it.  not necessary.
//             base_segmenter = (Segmenter) segmenter;
//             Method initializer = c.getMethod("initialize",String.class);
//             initializer.invoke(segmenter,config_filename);
            
            // System.out.println("telling base segmenter about print stream");
//             Method setprint = c.getMethod("setPrintStream",PrintStream.class);
//             setprint.invoke(base_segmenter,out);

        } catch (Exception e){ e.printStackTrace(); }
    }
    
    public void setTexts(HTextWrapper[] texts, int depth){
        D = texts.length;
        L = depth;
        m_texts = texts;
    }

    //durs is D x L , fine-to-course
    public void setDurationModel(List<Integer>[][] durs){
        m_durs = new List[durs.length][durs[0].length];
        for (int i = 0; i < D; i++){
            for (int l = 0; l < L; l++){
                m_durs[i][l] = new ArrayList<Integer>();
                if (local_edurs) m_durs[i][l].addAll (durs[i][l]);
            }
        }
        if (! local_edurs){ //add everybody to everybody
            for (int i = 0;i < D; i++){
                for (int l = 0; l < L; l++){
                    for (int i2 = 0; i2 < D; i2++){
                        m_durs[i2][l].addAll(durs[i][l]);
                    }
                }
            }
        }
    }

    //todo resolve this duration craziness
    public HSegmentation[] segmentTexts(){
        int[] start_pts = new int[D];
        HSegmentation[] segs = null;
        
        List<Integer>[] durs = new List[D];
        for (int i = 0; i < D; i++){
            durs[i] = m_durs[i][0]; // start at the top?
        }
        segs = segmentTexts(m_texts,L,start_pts,m_durs);
        
        return segs;
    }

    protected HSegmentation[] segmentTexts(HTextWrapper[] texts, 
                                           int depth, 
                                           int[] start_pt, 
                                           List<Integer> durs[][]){
        //tell the base_segmenter about the expected duration
        if (debug) out.println("num durs passed in to segmenttexts: "+durs.length);
        if (base_segmenter instanceof SegDurParametrizable){
            if (debug) out.println("setting durationmodel in GS.segmentTexts");
            List[] level_durs = new List[durs.length];
            for (int i = 0; i < durs.length; i++){
                level_durs[i] = durs[i][depth-1];
            }
            ((SegDurParametrizable)base_segmenter).setDurationModel(level_durs);
        }
        if (debug) out.println("calling base");
        List<Integer>[] segpts = base_segmenter.segmentTexts(texts, new int[texts.length]);
        if (debug) out.println("num segs: "+segpts[0].size());
        HSegmentation[] segs = new HSegmentation[texts.length];
        //add the initial segmentations
        for (int i = 0; i < texts.length; i++){
            segs[i] = new HSegmentation();
            for (int segpt : segpts[i]){
                segs[i].addSegment(segpt+start_pt[i]);
            }
        }
        if (depth > 1){
            //create a whole bunch of sub-documents
            int num_sub_docs = 0;
            for (int i = 0; i < texts.length; i++) num_sub_docs += segpts[i].size();
            HTextWrapper[] subdocs = new HTextWrapper[num_sub_docs];
            int[] next_start_pts = new int[num_sub_docs];
            int subdoc_ctr = 0;
            List<Integer>[][] next_durs = new List[subdocs.length][L];
            for (int i = 0; i < texts.length; i++){
                int start = 0;
//                 for (int l = 0; l < L; l++){
//                     System.out.println("durs to pass: "+durs[i][l]);
//                 }
                for (int segpt: segpts[i]){
                    if (debug) out.println
                                   (String.format
                                    ("%d %d %d %d %d",
                                     i,start_pt[i],start,segpt,texts[i].getSentenceCount()));
                    subdocs[subdoc_ctr] = texts[i].getSubtext(start,segpt);
                    next_start_pts[subdoc_ctr] = start + start_pt[i];
                    start = segpt;
                    //or L-depth??
                    for (int l = 0; l < L; l++){
                        next_durs[subdoc_ctr][l] = durs[i][l];
                    }
                    subdoc_ctr++;
                }
            }
            //call it recursively
            if (debug) out.println("calling recursively for "+subdocs.length+" documents at depth "+(depth-1)+" with start points: "+JacobUtil.formatArray("%d"," ",next_start_pts));
            HSegmentation[] subsegs = segmentTexts(subdocs,depth-1,next_start_pts,next_durs);
            
            //add the dudes 
            subdoc_ctr = 0;
            for (int i = 0; i < texts.length; i++){
                for (int segpt: segpts[i]){
                    segs[i].addSubsegmentation(subsegs[subdoc_ctr++]);
                }
            }
        }
        return segs;
    }
        
    public void setDebug(boolean debug){
        super.setDebug(debug);
        base_segmenter.setDebug(debug);
    }

    public void setPrintStream(PrintStream p_out){
        super.setPrintStream(p_out);
        if (base_segmenter != null){
            base_segmenter.setPrintStream(p_out);
        } else {
        }
    }

    Segmenter base_segmenter;
    String k_base_segmenter_name = "edu.mit.nlp.segmenter.RandomSegmenter";
    HTextWrapper[] m_texts;
    int L; //num levels
    int D; //num docs
    double[][] edurs; //D x L expected segment durations
    List<Integer>[][] m_durs;
}
