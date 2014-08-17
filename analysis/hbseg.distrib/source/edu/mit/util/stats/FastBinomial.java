package edu.mit.util.stats;

import java.lang.Math;

public class FastBinomial {
    public FastBinomial(int n, double r){
        this.n = n;
        this.r = r;
        log_r = Math.log(r);
        log_one_minus_r = Math.log(1-r);
        gamma = new FastDoubleGamma();
    }
    public void setGamma(FastGamma gamma){ this.gamma = gamma; }
    public void setN(int n){ this.n = n; 
        log_gamma_n = gamma.logGamma(n+1);
    }
    public void setR(double r){ this.r = r; 
        log_r = Math.log(r);
        log_one_minus_r = Math.log(1-r);
    }
    public double logpdf(int k){ return log_gamma_n - gamma.logGamma(k+1) - 
            gamma.logGamma(n-k+1) + k * log_r + (n-k) * log_one_minus_r;
    }
    public double pdf(int k){ return Math.exp(logpdf(k)); }
    public double logpdf(int k, int n, double r){
        if (n != this.n) setN(n);
        if (Math.abs(r -this.r)>tol) setR(r);
        return logpdf(k);
    }
    public double pdf(int k, int n, double r){ 
        return Math.exp(logpdf(k,n,r));
    }
    int n;
    double r;
    double log_r;
    double log_one_minus_r;
    double log_gamma_n;
    FastGamma gamma;
    static final double tol = 1e-5;
}
