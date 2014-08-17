package edu.mit.util.stats;

import cern.jet.stat.Gamma;
import java.util.HashMap;

/* computes the gamma function using the CERN code, doesn't memoizes results 
   for debugging
*/
public class SlowGamma implements FastGamma {
    public double logGamma(double in){
        return Gamma.logGamma(in);
    }
    public double gamma(final double in){
        return Gamma.gamma(in);
    }
    public void clear(){}
}
