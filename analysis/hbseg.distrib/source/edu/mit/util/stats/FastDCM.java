package edu.mit.util.stats;

import java.util.Arrays;
import edu.mit.util.JacobUtil;
import cern.jet.stat.Gamma;

public class FastDCM {
    public FastDCM(double prior, int W){
        this.prior = prior;
        this.W = W;
        gamma = new FastDoubleGamma(W,.5f);
        int_gamma = new FastIntGamma(200,prior);
        slow_gamma = new SlowGamma();
        //        slow_gamma = new SlowGamma();
        log_gamma_W_prior = gamma.logGamma(W * prior);
        W_log_gamma_prior = W * gamma.logGamma(prior);
    }
//     public FastDCM(double prior, int W, boolean expect_ints){
//         this.prior = prior;
//         this.W = W;
//         gamma = expect_ints?new FastIntGamma(W,prior):new FastDoubleGamma();
//         slow_gamma = new SlowGamma();
//         log_gamma_W_prior = gamma.logGamma(W * prior);
//         W_log_gamma_prior = W * gamma.logGamma(prior);
//     }
    public FastDCM(double prior, int W, FastGamma gamma){
        this.prior = prior;
        this.W = W;
        this.gamma = gamma;
        slow_gamma = new SlowGamma();
        int_gamma = new FastIntGamma(200,prior);

        //slow_gamma = new SlowGamma();
        log_gamma_W_prior = gamma.logGamma(W * prior);
        W_log_gamma_prior = W * gamma.logGamma(prior);
    }
    //maybe also code up the Elkan version?
    public double logDCM(double[] counts){
        double output = log_gamma_W_prior - W_log_gamma_prior;
        assert (W == counts.length);
        double N = 0;
        for (int i = 0; i < counts.length; i++){
            N += counts[i] + prior;
            output += gamma.logGamma(counts[i]+prior);
            
        }
        output -= gamma.logGamma(N);
        return output;
    }

    //this isn't great coding practice to repeat the body of the double version
    //but it's likely faster this way
    public double logDCM(int[] counts){
        double output = log_gamma_W_prior - W_log_gamma_prior;
        assert (W == counts.length);
        int N_int = 0;
        for (int i = 0; i < counts.length; i++){
            int count = counts[i];
            N_int += count;
            output += int_gamma.logGamma(count+prior);
            //output += gamma.logGamma(counts[i]+prior);
//             try {
//                 assert (Math.abs(int_gamma.logGamma(counts[i]+prior)-slow_gamma.logGamma(counts[i]+prior))<.0001); 
//             } catch (AssertionError e){
//                 System.out.println
//                     (String.format("count: %d prior: %.2f slow: %.2f fast: %.2f",
//                                    counts[i],
//                                    prior,
//                                    slow_gamma.logGamma(counts[i]+prior),
//                                    int_gamma.logGamma(counts[i])));
//             }
        }
        output -= gamma.logGamma(N_int + W * prior);
        return output;
    }

    public double logDCM(int[] counts, int sum){
        double output = log_gamma_W_prior - W_log_gamma_prior;
        for (int i = 0; i < W; i++){
            output += int_gamma.logGamma(counts[i]+prior);
        }
        output -= gamma.logGamma(sum + W*prior);
        return output;
    }

    public double logDCM(float[] counts, float sum){
        double output = log_gamma_W_prior - W_log_gamma_prior;
        for (int i = 0; i < W; i++){
            output += gamma.logGamma(counts[i]+prior);
        }
        output -= gamma.logGamma(sum + W*prior);
        return output;
    }

    public double logDCM(double[] counts, double sum){
        double output = log_gamma_W_prior - W_log_gamma_prior;
        for (int i = 0; i < W; i++){
            output += gamma.logGamma(counts[i]+prior);
        }
        output -= gamma.logGamma(sum + W*prior);
        return output;
    }
    
    public void setPrior(double prior){
        this.prior = prior;
        log_gamma_W_prior = gamma.logGamma(W * prior);
        assert (Math.abs(slow_gamma.logGamma(W*prior)-log_gamma_W_prior)<.0001);
        W_log_gamma_prior = W * gamma.logGamma(prior);
        assert (Math.abs(W_log_gamma_prior - W*slow_gamma.logGamma(prior))<.0001);
        int_gamma.setOffset(prior);
        //should we do this?
        gamma.clear();
    }

    public double getPrior(){ return prior; }
    public void setGamma(FastGamma gamma){ this.gamma = gamma; }
    public FastGamma getGamma(){ return gamma; }
    int W;
    double prior;
    //these terms are constant unless the number of segments is changing
     double log_gamma_W_prior;
     double W_log_gamma_prior;
    FastGamma gamma;
    FastIntGamma int_gamma;
    SlowGamma slow_gamma;
    boolean local_gamma;
}
