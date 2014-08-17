package edu.mit.util.stats;

import java.lang.Math;

/** 
    some useful static functions for using variational methods
**/
   
public class Variational {
    //i feel like this should never be negative, right?
    //ah, no it can if a[i] < 1
    //then sum a[i] > 1
    public static float logDirichletNormalizer (float[] a, FastGamma gamma){
        float out = 0;
        float sum = 0;
        for (int i = 0; i < a.length; i++){
            float ai = a[i];
            sum += ai;
            out += gamma.logGamma(ai);
        }
        return out - (float) gamma.logGamma(sum);
    }
    public static float logDirichletNormalizer(float[] a){
        return logDirichletNormalizer(a,new FastDoubleGamma());
    }
    public static double logDirichletNormalizer (double[] a, FastGamma gamma){
        double out = 0;
        double sum = 0;
        for (int i = 0; i < a.length; i++){
            double ai = a[i];
            sum += ai;
            out += gamma.logGamma(ai);
        }
        return out - (double) gamma.logGamma(sum);
    }
    public static double logDirichletNormalizer(double[] a){
        return logDirichletNormalizer(a,new FastDoubleGamma());
    }
}
