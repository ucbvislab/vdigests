package edu.mit.nlp.segmenter;;

import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Properties;
import java.util.Date;
import edu.mit.nlp.segmenter.MinCutSeg;
import edu.mit.nlp.MyTextWrapper;
import java.io.*;
import cern.jet.random.*;
import cern.jet.random.engine.MersenneTwister;
import cern.jet.random.engine.RandomEngine;


/**
   For initialization.  Returns a random segmentation, with the seg pts
   drawn at uniform from [0,T];
**/
public class RandomSegmenter extends Segmenter {
    public RandomSegmenter(){ 
    }
    //currently, there are no parameters
    public void initialize(String config_filename){
        Properties props = new Properties();
        try {
            props.load(new FileInputStream(config_filename));
            is_windowing_enabled = SegTesterParams.getBoolProp(props,"use-fixed-blocks",false);
            k_init_seed = SegTesterParams.getIntProp(props,"random-seed",-1);


            if (k_init_seed > 0){
                out.println("initializing engine with: "+k_init_seed);
                engine = new MersenneTwister(k_init_seed);
            }
            else {
                Date thedate = new Date();
                out.println("Initializing engine with: "+thedate);
                engine = new MersenneTwister(thedate);
            }
            Uniform.staticSetRandomEngine(engine);

        } catch (Exception e){
            e.printStackTrace();
        }
    }
    public List[] segmentTexts(MyTextWrapper[] texts, int[] num_segs){
        List[] hyps = new List[texts.length];
        for (int i = 0; i < texts.length; i++){
            try {
                hyps[i] = new ArrayList();
                //sort these
                for (int j = 0 ; j < num_segs[i]-1; j++){
                    hyps[i].add(Uniform.staticNextIntFromTo(1,texts[i].getText().size()-1));
                }           
                hyps[i].add(texts[i].getText().size());
                java.util.Collections.sort(hyps[i]);
            } catch (Exception e){
                e.printStackTrace();
            }
        }        
        return hyps;
    }
    public void setDebug(boolean debug){this.debug=debug;}
    boolean is_windowing_enabled = false;
    boolean debug =false;
    static int k_init_seed = 1000;
    RandomEngine engine;
}
                
