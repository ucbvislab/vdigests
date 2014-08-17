package edu.mit.nlp.segmenter;

import java.util.List;
import java.util.ArrayList;
import java.util.Properties;
import java.io.FileInputStream;
import edu.mit.nlp.MyTextWrapper;
import edu.mit.nlp.segmenter.duration.*;

public abstract class SegDurParametrizable extends Segmenter {
    public void initialize(String config_filename){
        Properties props = new Properties();
        try {
            props.load(new FileInputStream(config_filename));
            k_dm_classname = props.getProperty("duration-model",k_dm_classname);
            dm_class = Class.forName(k_dm_classname);
            local_edurs = SegTesterParams.getBoolProp(props,"local-edurs",false);
        } catch (Exception e){ e.printStackTrace(); }
    }

    public static List[] getDurs(MyTextWrapper[] texts){
        List[] out = new List[texts.length];
        for (int i = 0; i < texts.length; i++){
            out[i] = new ArrayList<Integer>();
            List<Integer> segpts = texts[i].getReferenceSeg();
            int prev = 0;
            for (int segpt : segpts){
                out[i].add(segpt - prev);
                prev = segpt;
            }
        }
        return out;
    }
    
    public void setDurationModel(MyTextWrapper[] texts){
        setDurationModel(getDurs(texts));
    }

    public void setDurationModel(List<Integer>[] durs){
        dm = new DurationModel[durs.length];
        for (int i = 0; i < durs.length; i++){
            try {
                dm[i] = (DurationModel) dm_class.getConstructor
                    (new Class[]{}).newInstance(new Object[]{});
            } catch (Exception e){ e.printStackTrace(); System.exit(0); }
        }
        for (int i = 0; i < durs.length; i++){
            for (int dur : durs[i]){
                if (! local_edurs){
                    //add it to all duration models
                    for (int k = 0; k < durs.length; k++){
                        dm[k].addDur(dur);
                    }
                } else { //just add it to the appropriate one
                    dm[i].addDur(dur);
                }
            }
        }
    }

    public float[] edurs(){
        float[] out = new float[dm.length];
        for (int i = 0; i < dm.length; i++){
            out[i] = dm[i].edur();
        }
        return out;
    }

    public DurationModel dm(int i){
        return dm[i];
    }

//     public double[] edursLocal(){
//         double[] edurs = new double[durs.length];
//         for (int i = 0; i < durs.length; i++){
//             double dur_sum = 0;
//             for (int dur : durs[i]){dur_sum += dur; }
//             edurs[i] = dur_sum / durs[i].size();
//         }
//         return edurs;
//     }

//     public double edurGlobal(){
//         double dur_sum = 0;
//         double ns = 0;
//         for (int i = 0; i < durs.length; i++){
//             for (int dur : durs[i]){dur_sum += dur; 
//                 ns++;
//             }
//         }
//         return dur_sum / ns;
//     }
    
    public boolean local_edurs;
    protected DurationModel dm[]; //size D
    Class dm_class;
    static String k_dm_classname = "edu.mit.nlp.segmenter.duration.MarkovDurationModel";
}
