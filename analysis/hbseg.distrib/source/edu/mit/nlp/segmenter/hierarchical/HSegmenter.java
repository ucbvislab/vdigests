package edu.mit.nlp.segmenter.hierarchical;

import java.io.PrintStream;
import java.io.FileInputStream;
import java.util.List;
import java.util.Properties;
import edu.mit.nlp.segmenter.SegTesterParams;
import edu.mit.nlp.segmenter.duration.*;

/**
   If you want to have a segmenter be evaluated in {@link HSegTester}, you must
   write a wrapper that implements this interface.  
 **/
public abstract class HSegmenter {
    public HSegmenter(){
        out = System.out;
    }

    /**
       Do whatever initialize you need from this config file 
       
       @param config_filename the path to the config file
    **/
    public void initialize(String config_filename){
        Properties props = new Properties();
        try {
            props.load(new FileInputStream(config_filename));
            k_dm_classname = props.getProperty("duration-model",k_dm_classname);
            dm_class = Class.forName(k_dm_classname);
            local_edurs = SegTesterParams.getBoolProp(props,"local-edurs",false);
        } catch (Exception e){ e.printStackTrace(); }
    }

    public abstract void setTexts(HTextWrapper[] texts, int depth);
    public abstract HSegmentation[] segmentTexts();

    /**
       segment a bunch of texts.  we do this jointly in case you want to 
       do processing across the whole set of texts together

       @param texts the array of texts
       @param edurs a DxL array of expected subsegment durations, where
       D is the number of documents and L is the depth.  
       @return a list of arrays of segmentation points
    **/
                                 //    public abstract HSegmentation[] segmentTexts(HTextWrapper[] texts, double[][] edurs);

    /**
       tells your d00d to set its debug flag 
    **/
    public void setDebug(boolean debug){ this.debug = debug; }
    public void setPrintStream(PrintStream out){ this.out = out; }

    public void setDurationModel(List<Integer>[][] durs){
        dm = new DurationModel[durs.length][durs[0].length];
        for (int i = 0; i < durs.length; i++){
            for (int l = 0; l < durs[i].length; l++){
                try {
                    dm[i][l] = (DurationModel) 
                        dm_class.
                        getConstructor(new Class[]{}).newInstance(new Object[]{});
                } catch (Exception e){
                    e.printStackTrace();
                    System.exit(0);
                }
            }
        }
        if (dm_class.getSimpleName().equals("MarkovHierDurationModel")){
            for (int i = 0; i < durs.length; i++){
                for (int l = 1; l < durs[i].length; l++){
                    ((MarkovHierDurationModel)dm[i][l]).setSubDurationModel(dm[i][l-1]);
                }
            }
        }

        for (int i = 0; i < durs.length; i++){
            for (int l = 0; l < durs[i].length; l++){
                //                dm[i][l] = new MarkovDurationModel();
                //dm[i][l] = dm_class.newInstance();
                for (int dur : durs[i][l]){
                    if (! local_edurs){
                        //add it to all duration models
                        for (int k = 0; k < durs.length; k++){
                            dm[k][l].addDur(dur);
                        }
                    } else { //just add it to the appropriate one
                        dm[i][l].addDur(dur);
                    }
                }
            }
        }
        if (debug){
            for (int i = 0; i < durs.length; i++){
                for (int l = 0; l < durs[i].length; l++){
                    out.println
                        (String.format("edur[%d][%d]: %s",
                                       i,l,dm[i][l].toString()));
                }
            }
        }
    }

    DurationModel dm[][]; //size DxL
    Class dm_class;

    public PrintStream out;
    public boolean debug;
    boolean local_edurs;
    static String k_dm_classname = "edu.mit.nlp.segmenter.duration.MarkovDurationModel";
}
