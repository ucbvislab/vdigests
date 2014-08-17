package edu.mit.nlp.segmenter.duration;

import java.util.List;

public class NormalDurationModel implements DurationModel {
    public double logPDur(int dur){
        float mu = edur();
        float stdev = stdev();

        //log normal, not including log(sqrt(2pi))
//         System.out.println
//             (String.format("logPdur(%d,%f,%f)=%f",
//                            dur,mu,stdev,
//                            -(dur-mu)*(dur-mu)/(2*stdev*stdev) - Math.log(stdev)));
        return -(dur-mu)*(dur-mu)/(2*stdev*stdev) - Math.log(stdev);
    }
    public void addDur(int dur){
        dur_sum += dur; 
        n++;
        dur_ss += dur*dur;
//         System.out.println
//             (String.format("adding dur %d, durss=%f, sigma=%f",
//                            dur,
//                            dur_ss,
//                            dur_ss/n - dur_sum * dur_sum / (n*n)));
    }
    public void setDurationModel(List<Integer>[][] durs){
        clearDurationModel();
        for (int i = 0; i < durs.length; i++)
            for (int j = 0; j < durs[i].length; j++)
                for (int dur : durs[i][j])
                    addDur(dur);
                    
    }
    public void clearDurationModel(){
        dur_sum = 0; n = 0; dur_ss = 0;
    }
    public float edur(){
        return dur_sum / n;
    }
    public float stdev(){
        float mu = edur();
        float stdev = (float) Math.sqrt(mu); //HACK! -- should be Bayesian
        if (n > 1){
            stdev = (float) Math.sqrt(dur_ss / (n - 1) - mu * mu * (n / (n-1))); 
            //Var[x] = E[x^2] - E^2[x]
            //std[x] = sqrt(Var[x])
        }
        return stdev;
    }
    public String toString(){
        return String.format("Normal Duration Model, mean = %.2e, stdev = %.2e",
                             edur(), stdev());
    }

    public static void main(String argv[]){
        int[] durs = new int[]{5, 10, 5, 8, 7, 9, 15};
        NormalDurationModel dm = new NormalDurationModel();
        for (int i = 0; i < durs.length; i++){ dm.addDur(durs[i]); }
        for (int i = 0; i < durs.length; i++){
            System.out.println(String.format("log p(%d)=%.3f",durs[i],
                                             dm.logPDur(durs[i])-
                                             dm.logPDur(durs[0])));
        }
        System.out.println(dm);
    }

    protected float dur_sum;
    protected float dur_ss; //sum of squares
    protected float n;
}
