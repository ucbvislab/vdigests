package edu.mit.nlp.segmenter.duration;

import java.util.List;

public class MarkovDurationModel implements DurationModel {
    public double logPDur(int dur){
        float r = n / dur_sum;
        return (dur - 1) * Math.log(1-r) + Math.log(r);
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
        return String.format("Markov Duration Model, r = %.2e", n / dur_sum);
    }

    protected float dur_sum;
    protected float n;
}
