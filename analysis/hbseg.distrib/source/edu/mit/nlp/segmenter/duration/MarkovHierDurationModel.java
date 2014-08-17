package edu.mit.nlp.segmenter.duration;

import java.util.List;

public class MarkovHierDurationModel implements DurationModel {
    public MarkovHierDurationModel(){//DurationModel p_lower){
        sub_duration_model = null;
    }
    public void setSubDurationModel(DurationModel sdm){
        sub_duration_model = sdm;
    }
    public double logPDur(int dur){
        float out = 0;
        //if (sub_duration_model == null){ //just do what you did before

        float r = n / dur_sum;
        float alt_out = (float) ((dur - 1) * Math.log(1-r)) + (float) Math.log(r);
        float alt_r = r;
        if (sub_duration_model!=null){
            //r must consider expected number of candidate segmentation points
            r = sub_duration_model.edur() / edur();
            out = (float) ((dur - 1) / sub_duration_model.edur() * Math.log(1-r) + Math.log(r));
        }
        else out = alt_out;

//         if (sub_duration_model != null){
//             System.out.println
//                 (String.format("P(%d) = %.4f(%.4f), was %.4f(%.4f)",dur,out,r,alt_out,alt_r));
//        }
        return out;
    }
    public void addDur(int dur){
        dur_sum += dur; n++;
    }
    public void setDurationModel(List<Integer>[][] durs){
        clearDurationModel();
        for (int i = 0; i < durs.length; i++)
            for (int j = 0; j < durs[i].length; j++)
                for (int dur : durs[i][j])
                    addDur(dur);
                    
    }
    public void clearDurationModel(){
        dur_sum = 0; n = 0;
    }
    public float edur(){
        return dur_sum / n;
    }
    public String toString(){
        return String.format("Markov Hierarchical Duration Model, r = %.2e, lower=%s", 
                             n / dur_sum,
                             (sub_duration_model==null?
                              "null":sub_duration_model.toString()));
    }
    protected DurationModel sub_duration_model;
    protected float dur_sum;
    protected float n;
}
