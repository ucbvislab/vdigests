package edu.mit.nlp.segmenter.duration;

import java.util.List;
import edu.mit.util.stats.FastDoubleGamma;
import edu.mit.util.stats.FastGamma;

public class GammaDurationModel implements DurationModel {
    public double logPDur(int dur){
        float k = k();
        float theta = theta();

        //log normal, not including log(sqrt(2pi))
//         System.out.println
//             (String.format("logPdur(%d,%f,%f)=%f",
//                            dur,mu,stdev,
//                            -(dur-mu)*(dur-mu)/(2*stdev*stdev) - Math.log(stdev)));
        return (k-1)*Math.log(dur) - dur / theta - k * Math.log(theta) -  gamma.logGamma(k);
    }
    public void addDur(int dur){
        dur_sum += dur; 
        n++;
        dur_sum_ln += Math.log(dur);
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
    
    /** this is the ml estimator */
    public float theta(){
        return dur_sum / (k() * n);
    }

    /** this is an approximation.  see wikipedia **/
    public float k(){
        float s = (float) (Math.log(edur()) - dur_sum_ln / n);
        return (float) (3 - s + Math.sqrt((s-3)*(s-3)+24*s)) / (12 * s);
    }
         

    public void clearDurationModel(){
        dur_sum = 0; n = 0; dur_sum_ln = 0;
    }
    public float edur(){
        return dur_sum / n;
    }
    public String toString(){
        return String.format("Gamma Duration Model, k = %.5e, theta = %.5e, edur = %.4e",
                             k(), theta(), edur());
    }
    public GammaDurationModel(){
        gamma = new FastDoubleGamma();
    }

    public static void main(String argv[]){
        int[] durs = new int[]{5, 10, 5, 8, 7, 9, 15};
        GammaDurationModel dm = new GammaDurationModel();
        for (int i = 0; i < durs.length; i++){ dm.addDur(durs[i]); }
        for (int i = 0; i < durs.length; i++){
            System.out.println(String.format("log p(%d)=%.3f",durs[i],
                                             dm.logPDur(durs[i])-
                                             dm.logPDur(durs[0])));
        }
        System.out.println(dm);
    }

    protected float dur_sum;
    protected float dur_sum_ln; //sum of squares
    protected float n;
    protected FastGamma gamma;
}
