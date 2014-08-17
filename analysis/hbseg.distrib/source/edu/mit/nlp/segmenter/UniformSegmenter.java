package edu.mit.nlp.segmenter;;

import java.util.List;
import java.util.ArrayList;
import java.util.Properties;
import edu.mit.nlp.segmenter.MinCutSeg;
import edu.mit.nlp.MyTextWrapper;
import java.io.*;

/** for testing the evaluation -- returns a uniform segmentation **/
public class UniformSegmenter extends SegDurParametrizable {
    public UniformSegmenter(){ 
    }
    //currently, there are no parameters
    public void initialize(String config_filename){
        Properties props = new Properties();
        super.initialize(config_filename);
        try {
            props.load(new FileInputStream(config_filename));
        } catch (Exception e){
            e.printStackTrace();
        }
    }
    public List[] segmentTexts(MyTextWrapper[] texts, int[] num_segs){
        return segmentTexts(texts);
    }

    public List[] segmentTexts(MyTextWrapper[] texts){
        List[] hyps = new List[texts.length];
        for (int i = 0; i < texts.length; i++){
            hyps[i] = new ArrayList<Integer>();
            for (float j = (float) edurs()[i]; j < texts[i].getSentenceCount(); j+=edurs()[i]){
                hyps[i].add((int)j);
            }
            hyps[i].add(texts[i].getSentenceCount());
        }
        return hyps;
    }
    public void setDebug(boolean debug){this.debug=debug;}
    boolean debug =false;
}
                
