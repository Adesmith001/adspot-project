import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useBlocker } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdArrowBack,
  MdArrowForward,
  MdCheck,
  MdCloudUpload,
  MdLocationOn,
  MdDelete,
  MdCameraAlt,
  MdMyLocation,
} from "react-icons/md";
import GoogleMapInteractive from "@/components/GoogleMapInteractive";
import DashboardLayout from "@/components/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { useAppSelector } from "@/hooks/useRedux";
import { selectUser } from "@/store/authSlice";
import { createBillboard } from "@/services/billboard.service";
import {
  geocodeAddress,
  getCurrentBrowserLocation,
  reverseGeocodeCoordinates,
} from "@/services/location.service";
import {
  getUserProfile,
  updateOwnerCommercialSettings,
} from "@/services/user.service";
import type {
  BillboardType,
  CreateBillboardForm,
} from "@/types/billboard.types";
import { extractGpsFromFiles } from "@/utils/exif.utils";
import StreetViewPanel from "@/components/StreetViewPanel";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";

const STEPS = [
  { id: 1, name: "Basic Info", description: "Title and description" },
  {
    id: 2,
    name: "Photos & Location",
    description: "Upload images to detect location",
  },
  { id: 3, name: "Location Details", description: "Address and map" },
  { id: 4, name: "Specifications", description: "Size and type details" },
  { id: 5, name: "Pricing", description: "Set your rates" },
  { id: 6, name: "Booking Rules", description: "Availability settings" },
  { id: 7, name: "Review", description: "Confirm and submit" },
];

// default Lagos center points
const defaultCenter: [number, number] = [6.5244, 3.3792];
const MAX_PHOTOS = 12;
const MAX_PHOTO_SIZE_MB = 12;
const CREATE_LISTING_DRAFT_KEY_PREFIX = "create-listing-draft:";

const INITIAL_FORM_DATA: CreateBillboardForm = {
  category: "billboard",
  title: "",
  description: "",
  address: "",
  city: "",
  state: "",
  landmark: "",
  width: 0,
  height: 0,
  unit: "ft",
  type: "flex",
  hasLighting: false,
  trafficScore: 5,
  orientation: "landscape",
  hourlyPrice: 0,
  dailyPrice: 0,
  weeklyPrice: 0,
  monthlyPrice: 0,
  designServiceAvailable: false,
  designServicePrice: 0,
  instantBook: false,
  minDuration: 1,
  maxDuration: 365,
  cancellationPolicy: "moderate",
  advanceNotice: 1,
  latitude: undefined,
  longitude: undefined,
};

interface CreateListingDraft {
  version: 1;
  currentStep: number;
  formData: CreateBillboardForm;
  savedAt: number;
}

const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [extractingLocation, setExtractingLocation] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [geocodingAddress, setGeocodingAddress] = useState(false);
  const [locationLookupNote, setLocationLookupNote] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [showRestoreDraftModal, setShowRestoreDraftModal] = useState(false);

  const skipNextAddressLookupRef = useRef(false);
  const pendingDraftRef = useRef<CreateListingDraft | null>(null);
  const lastResolvedAddressQueryRef = useRef("");
  const previewUrlsRef = useRef<string[]>([]);

  const [formData, setFormData] =
    useState<CreateBillboardForm>(INITIAL_FORM_DATA);

  const getDraftKey = () =>
    `${CREATE_LISTING_DRAFT_KEY_PREFIX}${user?.uid || "anonymous"}`;

  const updateFormData = (field: keyof CreateBillboardForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const saveDraft = () => {
    const draft: CreateListingDraft = {
      version: 1,
      currentStep,
      formData,
      savedAt: Date.now(),
    };

    localStorage.setItem(getDraftKey(), JSON.stringify(draft));
    setHasUnsavedChanges(false);
    toast.success("Draft saved. You can continue later.");
  };

  const startOver = () => {
    setShowStartOverModal(true);
  };

  const confirmStartOver = () => {
    photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoPreviewUrls([]);
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
    setLocationLookupNote("");
    localStorage.removeItem(getDraftKey());
    setHasUnsavedChanges(false);
    setShowStartOverModal(false);
    toast.success("Listing form reset.");
  };

  const applyCoordinates = async (
    lat: number,
    lng: number,
    source: "photo" | "camera" | "map" | "address" | "device"
  ) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));

    if (source === "address") {
      setLocationLookupNote(
        "Map and street view updated from the address details you entered."
      );
      return;
    }

    setResolvingAddress(true);
    const resolvedAddress = await reverseGeocodeCoordinates(lat, lng);
    setResolvingAddress(false);

    if (!resolvedAddress) {
      setLocationLookupNote(
        "Coordinates found, but we could not fetch the street details automatically."
      );
      return;
    }

    skipNextAddressLookupRef.current = true;
    const nextAddressQuery = [
      resolvedAddress.address,
      resolvedAddress.city,
      resolvedAddress.state,
    ]
      .filter(Boolean)
      .join("|");
    lastResolvedAddressQueryRef.current = nextAddressQuery;

    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: resolvedAddress.address || prev.address,
      city: resolvedAddress.city || prev.city,
      state: resolvedAddress.state || prev.state,
      landmark: prev.landmark || resolvedAddress.landmark || "",
    }));

    setLocationLookupNote(
      source === "map"
        ? "Map pin moved and the closest street details were filled automatically."
        : source === "device"
        ? "We used your current device location and filled in the nearest street details automatically."
        : "Coordinates and street details were extracted automatically from the photo."
    );
  };

  const tryCurrentLocationFallback = async (
    reason: "photo" | "camera" | "manual"
  ) => {
    setGettingCurrentLocation(true);
    const currentLocation = await getCurrentBrowserLocation();
    setGettingCurrentLocation(false);

    if (!currentLocation) {
      return null;
    }

    await applyCoordinates(
      currentLocation.latitude,
      currentLocation.longitude,
      "device"
    );

    const accuracySuffix =
      typeof currentLocation.accuracy === "number"
        ? ` Accuracy: about ${Math.round(currentLocation.accuracy)}m.`
        : "";

    if (reason === "manual") {
      toast.success(`Current location captured.${accuracySuffix}`, {
        duration: 5000,
      });
    } else {
      toast.success(
        `Photo GPS was unavailable, so we used your current device location.${accuracySuffix}`,
        {
          duration: 5000,
        }
      );
    }

    return currentLocation;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const selectedFiles = Array.from(files);
      const availableSlots = Math.max(0, MAX_PHOTOS - photos.length);

      if (availableSlots === 0) {
        toast.error(`Maximum of ${MAX_PHOTOS} photos reached.`);
        e.target.value = "";
        return;
      }

      const oversized = selectedFiles.find(
        (file) => file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024
      );
      if (oversized) {
        toast.error(
          `Some photos are too large. Max size is ${MAX_PHOTO_SIZE_MB}MB per photo.`
        );
        e.target.value = "";
        return;
      }

      const newPhotos = selectedFiles.slice(0, availableSlots);
      setPhotos((prev) => [...prev, ...newPhotos]);
      setHasUnsavedChanges(true);
      newPhotos.forEach((file) => {
        const url = URL.createObjectURL(file);
        setPhotoPreviewUrls((prev) => [...prev, url]);
      });

      // Extract GPS from newly uploaded files
      if (!formData.latitude || !formData.longitude) {
        setExtractingLocation(true);
        try {
          const gps = await extractGpsFromFiles(newPhotos);
          if (gps) {
            await applyCoordinates(gps.latitude, gps.longitude, "photo");
            toast.success("📍 Location detected from photo!", {
              duration: 4000,
            });
          }
          if (!gps) {
            const fallback = await tryCurrentLocationFallback("photo");
            if (!fallback) {
              toast(
                "This photo does not contain GPS metadata. Allow location access or place the pin manually on the map.",
                {
                  icon: "i",
                  duration: 5000,
                }
              );
            }
          }
        } catch {
          const fallback = await tryCurrentLocationFallback("photo");
          if (!fallback) {
            toast.error(
              "We couldn't read a location from this photo. Please allow device location or place the pin manually."
            );
          }
        } finally {
          setExtractingLocation(false);
        }
      }

      e.target.value = "";
    }
  };

  const handleCameraCapture = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFiles = Array.from(files);
      const availableSlots = Math.max(0, MAX_PHOTOS - photos.length);

      if (availableSlots === 0) {
        toast.error(`Maximum of ${MAX_PHOTOS} photos reached.`);
        e.target.value = "";
        return;
      }

      const oversized = selectedFiles.find(
        (file) => file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024
      );
      if (oversized) {
        toast.error(
          `Some photos are too large. Max size is ${MAX_PHOTO_SIZE_MB}MB per photo.`
        );
        e.target.value = "";
        return;
      }

      const newPhotos = selectedFiles.slice(0, availableSlots);
      setPhotos((prev) => [...prev, ...newPhotos]);
      setHasUnsavedChanges(true);
      newPhotos.forEach((file) => {
        const url = URL.createObjectURL(file);
        setPhotoPreviewUrls((prev) => [...prev, url]);
      });

      // Always try to extract GPS from camera captures
      setExtractingLocation(true);
      try {
        const gps = await extractGpsFromFiles(newPhotos);
        if (gps) {
          await applyCoordinates(gps.latitude, gps.longitude, "camera");
          toast.success("📍 Location detected from camera photo!", {
            duration: 4000,
          });
        } else {
          const fallback = await tryCurrentLocationFallback("camera");
          if (fallback) {
            e.target.value = "";
            setExtractingLocation(false);
            return;
          }
          toast(
            "No GPS data found in this photo. Allow device location or place the pin manually on the map.",
            {
              icon: "ℹ️",
              duration: 5000,
            }
          );
        }
      } catch {
        const fallback = await tryCurrentLocationFallback("camera");
        if (!fallback) {
          toast.error(
            "We couldn't detect a location from this photo. Please allow device location or place the pin manually."
          );
        }
      } finally {
        setExtractingLocation(false);
      }

      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    const urlToRevoke = photoPreviewUrls[index];
    if (urlToRevoke) {
      URL.revokeObjectURL(urlToRevoke);
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be logged in to create a listing");
      return;
    }
    setIsSubmitting(true);
    try {
      await createBillboard(
        user.uid,
        user.displayName || "Unknown",
        formData,
        photos
      );

      try {
        await updateOwnerCommercialSettings(user.uid, {
          primaryAssetType: formData.category,
        });
      } catch (profileError) {
        console.error("Unable to sync owner asset preference:", profileError);
      }

      toast.success("Listing submitted for admin review.");
      localStorage.removeItem(getDraftKey());
      setHasUnsavedChanges(false);
      navigate("/dashboard/owner/listings");
    } catch (error: any) {
      toast.error(error.message || "Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.length >= 5 && formData.description.length >= 20;
      case 2:
        return photos.length >= 1;
      case 3:
        return formData.address && formData.city && formData.state;
      case 4:
        return formData.width > 0 && formData.height > 0;
      case 5:
        return (
          (formData.category === "screen"
            ? (formData.hourlyPrice || 0) > 0
            : formData.dailyPrice > 0) &&
          (!formData.designServiceAvailable || formData.designServicePrice > 0)
        );
      case 6:
        return true;
      case 7:
        return true;
      default:
        return true;
    }
  };

  // Remove nigerianStates and nigerianCities constants to use standard text input

  const stepContentVariants = {
    initial: { opacity: 0, x: 30 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.35, ease: "easeOut" },
    },
    exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
  };

  const onMapClick = (lat: number, lng: number) => {
    void applyCoordinates(lat, lng, "map");
  };

  useEffect(() => {
    const address = formData.address.trim();
    const city = formData.city.trim();
    const state = formData.state.trim();

    if (!address || !city || !state) {
      return;
    }

    const query = [address, city, state].join("|");

    if (skipNextAddressLookupRef.current) {
      skipNextAddressLookupRef.current = false;
      lastResolvedAddressQueryRef.current = query;
      return;
    }

    if (lastResolvedAddressQueryRef.current === query) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setGeocodingAddress(true);
      const coords = await geocodeAddress(address, city, state);
      setGeocodingAddress(false);

      if (!coords) {
        setLocationLookupNote(
          "We could not place that address accurately. Adjust the wording or set it manually on the map."
        );
        return;
      }

      lastResolvedAddressQueryRef.current = query;
      await applyCoordinates(coords.latitude, coords.longitude, "address");
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [formData.address, formData.city, formData.state]);

  useEffect(() => {
    previewUrlsRef.current = photoPreviewUrls;
  }, [photoPreviewUrls]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const confirmRestoreDraft = () => {
    const draft = pendingDraftRef.current;
    if (!draft) return;
    setFormData({ ...INITIAL_FORM_DATA, ...draft.formData });
    setCurrentStep(Math.min(Math.max(draft.currentStep || 1, 1), 7));
    setHasUnsavedChanges(false);
    setShowRestoreDraftModal(false);
    pendingDraftRef.current = null;
    toast.success("Draft restored. Re-upload photos before submitting.");
  };

  const dismissRestoreDraft = () => {
    pendingDraftRef.current = null;
    setShowRestoreDraftModal(false);
  };

  useEffect(() => {
    const serializedDraft = localStorage.getItem(getDraftKey());
    if (!serializedDraft) {
      return;
    }

    try {
      const parsedDraft = JSON.parse(serializedDraft) as CreateListingDraft;
      if (!parsedDraft?.formData) {
        return;
      }

      pendingDraftRef.current = parsedDraft;
      setShowRestoreDraftModal(true);
    } catch {
      localStorage.removeItem(getDraftKey());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    const loadOwnerDefaults = async () => {
      if (!user?.uid || pendingDraftRef.current) {
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        if (!profile?.primaryAssetType) {
          return;
        }

        setFormData((prev) =>
          prev.title || prev.description || prev.category === profile.primaryAssetType
            ? prev
            : { ...prev, category: profile.primaryAssetType || "billboard" },
        );
      } catch (error) {
        console.error("Failed to load owner defaults:", error);
      }
    };

    void loadOwnerDefaults();
  }, [user?.uid]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                What do you primarily rent out? *
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                This sets the main inventory type for this listing and becomes
                your default owner focus unless you change it later.
              </p>
              <div className="flex gap-4">
                {(["billboard", "screen"] as const).map((category) => (
                  <motion.button
                    key={category}
                    type="button"
                    onClick={() => updateFormData("category", category)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      formData.category === category
                        ? "border-primary-600 bg-primary-50 shadow-soft"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <span className="capitalize font-bold text-neutral-900">
                      {category === "billboard" ? "Billboards" : "Screens"}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {formData.category === "billboard" ? "Billboard" : "Screen"}{" "}
                Title *
              </label>
              <Input
                type="text"
                placeholder={`e.g., Premium LED ${
                  formData.category === "billboard" ? "Billboard" : "Screen"
                } - Lekki Phase 1`}
                value={formData.title}
                onChange={(e) => updateFormData("title", e.target.value)}
              />
              <p className="text-xs text-neutral-500 mt-2">
                Minimum 5 characters. Be descriptive and specific.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Description *
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-all duration-200"
                rows={4}
                placeholder={`Describe your ${formData.category} location, visibility, nearby landmarks, traffic volume, and any special features...`}
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
              />
              <p className="text-xs text-neutral-500 mt-2">
                Minimum 20 characters. The more detail, the better.
              </p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            {/* Instruction */}
            <div className="bg-primary-50 rounded-2xl p-5 border border-primary-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MdMyLocation size={22} className="text-primary-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-1">
                    Auto-detect location
                  </h4>
                  <p className="text-sm text-neutral-600">
                    Upload or take a photo at your site. We'll automatically
                    extract the GPS coordinates to pinpoint its exact location
                    on the map.
                  </p>
                </div>
              </div>
            </div>

            {/* Photo Upload Section */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Upload Photos *
              </label>
              <p className="text-sm text-neutral-500 mb-4">
                Add at least 1 photo. Photos taken on-site will auto-detect
                location.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <AnimatePresence>
                  {photoPreviewUrls.map((url, index) => (
                    <motion.div
                      key={url}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                      className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-neutral-200"
                    >
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <MdDelete size={16} />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Upload from gallery */}
                <label className="aspect-square rounded-2xl border-2 border-dashed border-neutral-300 hover:border-primary-500 hover:bg-primary-50/30 flex flex-col items-center justify-center cursor-pointer transition-all duration-200">
                  <MdCloudUpload size={32} className="text-neutral-400 mb-2" />
                  <span className="text-sm text-neutral-600 font-medium">
                    Upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {/* Camera capture */}
                <label className="aspect-square rounded-2xl border-2 border-dashed border-accent-300 hover:border-accent-500 hover:bg-accent-50/30 flex flex-col items-center justify-center cursor-pointer transition-all duration-200">
                  <MdCameraAlt size={32} className="text-accent-400 mb-2" />
                  <span className="text-sm text-accent-600 font-medium">
                    Take Photo
                  </span>
                  <span className="text-xs text-accent-400 mt-0.5">
                    Best for GPS
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* GPS extraction status */}
            <AnimatePresence>
              {extractingLocation && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100"
                >
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-primary-700 font-medium">
                    Extracting location from photo...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Location detected indicator */}
            <AnimatePresence>
              {formData.latitude && formData.longitude && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <MdLocationOn size={22} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          📍 Location Detected!
                        </p>
                        <p className="text-xs text-green-600 font-mono">
                          {formData.latitude.toFixed(6)},{" "}
                          {formData.longitude.toFixed(6)}
                        </p>
                        {(formData.address ||
                          formData.city ||
                          formData.state) && (
                          <p className="text-xs text-green-700 mt-1">
                            {formData.address || "Address pending"},{" "}
                            {formData.city || "City pending"},{" "}
                            {formData.state || "State pending"}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {(resolvingAddress || geocodingAddress || locationLookupNote) && (
              <Card className="p-4 bg-white border border-neutral-200">
                <p className="text-sm font-medium text-neutral-800 mb-1">
                  Location sync
                </p>
                {resolvingAddress && (
                  <p className="text-xs text-neutral-500">
                    Looking up the street, city, and state from the detected
                    coordinates...
                  </p>
                )}
                {geocodingAddress && (
                  <p className="text-xs text-neutral-500">
                    Using your address details to place the billboard on the
                    map...
                  </p>
                )}
                {!resolvingAddress &&
                  !geocodingAddress &&
                  locationLookupNote && (
                    <p className="text-xs text-neutral-500">
                      {locationLookupNote}
                    </p>
                  )}
              </Card>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                State *
              </label>
              <Input
                type="text"
                placeholder="e.g., Lagos"
                value={formData.state}
                onChange={(e) => updateFormData("state", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                City/Area *
              </label>
              <Input
                type="text"
                placeholder="e.g., Lekki Phase 1"
                value={formData.city}
                onChange={(e) => updateFormData("city", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Full Address *
              </label>
              <Input
                type="text"
                placeholder="e.g., 123 Admiralty Way, opposite Chevron"
                value={formData.address}
                onChange={(e) => updateFormData("address", e.target.value)}
                icon={<MdLocationOn />}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Nearby Landmark (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., Near Shoprite, Opposite GTBank"
                value={formData.landmark || ""}
                onChange={(e) => updateFormData("landmark", e.target.value)}
              />
            </div>

            {/* Interactive Map */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {formData.category === "billboard" ? "Billboard" : "Screen"}{" "}
                Location on Map
              </label>
              {formData.latitude && formData.longitude ? (
                <p className="text-xs text-neutral-500 mb-3">
                  Location auto-detected from your photo or typed address. Drag
                  the pin or click on the map to adjust.
                </p>
              ) : (
                <p className="text-xs text-neutral-500 mb-3">
                  No GPS data extracted yet. Click anywhere on the map to set
                  the location, or go back and upload a photo taken at the site.
                </p>
              )}

              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void tryCurrentLocationFallback("manual")}
                  disabled={gettingCurrentLocation}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MdMyLocation size={16} />
                  {gettingCurrentLocation
                    ? "Getting current location..."
                    : "Use Current Location"}
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-neutral-200 shadow-soft relative z-0">
                <GoogleMapInteractive
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  defaultCenter={defaultCenter}
                  onLocationChange={onMapClick}
                  heightClassName="h-[350px]"
                />
              </div>

              {/* Coordinates display */}
              {formData.latitude && formData.longitude && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 flex items-center gap-2"
                >
                  <MdLocationOn size={16} className="text-primary-500" />
                  <span className="text-xs text-neutral-500 font-mono">
                    Lat: {formData.latitude.toFixed(6)} • Lng:{" "}
                    {formData.longitude.toFixed(6)}
                  </span>
                </motion.div>
              )}

              {formData.latitude && formData.longitude && (
                <div className="mt-4">
                  <StreetViewPanel
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    title="Street-Level Preview"
                    subtitle="This helps confirm the location is positioned correctly on the map."
                    heightClassName="h-[280px]"
                  />
                </div>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Width *
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 20"
                  value={formData.width || ""}
                  onChange={(e) =>
                    updateFormData("width", Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Height *
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  value={formData.height || ""}
                  onChange={(e) =>
                    updateFormData("height", Number(e.target.value))
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Unit
              </label>
              <div className="flex gap-4">
                {(["ft", "m"] as const).map((unit) => (
                  <label
                    key={unit}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="unit"
                      value={unit}
                      checked={formData.unit === unit}
                      onChange={() => updateFormData("unit", unit)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-neutral-700">
                      {unit === "ft" ? "Feet" : "Meters"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {formData.category === "billboard" && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Billboard Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(["flex", "digital", "led"] as BillboardType[]).map(
                    (type) => (
                      <motion.button
                        key={type}
                        type="button"
                        onClick={() => updateFormData("type", type)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.type === type
                            ? "border-primary-600 bg-primary-50 shadow-soft"
                            : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <span className="capitalize font-medium text-neutral-900">
                          {type}
                        </span>
                      </motion.button>
                    )
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Orientation
              </label>
              <div className="flex gap-4">
                {(["landscape", "portrait"] as const).map((orientation) => (
                  <label
                    key={orientation}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="orientation"
                      value={orientation}
                      checked={formData.orientation === orientation}
                      onChange={() =>
                        updateFormData("orientation", orientation)
                      }
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-neutral-700 capitalize">
                      {orientation}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {formData.category === "billboard" && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasLighting"
                  checked={formData.hasLighting}
                  onChange={(e) =>
                    updateFormData("hasLighting", e.target.checked)
                  }
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="hasLighting" className="text-neutral-700">
                  Has lighting (visible at night)
                </label>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Traffic Score (1-10):{" "}
                <span className="text-primary-600 font-bold">
                  {formData.trafficScore}
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.trafficScore}
                onChange={(e) =>
                  updateFormData("trafficScore", Number(e.target.value))
                }
                className="w-full"
              />
              <p className="text-xs text-neutral-500 mt-2">
                Estimate daily foot/vehicle traffic. 10 = Very High Traffic
              </p>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <Card className="p-5 bg-primary-50/50 border-primary-100">
              <p className="text-sm font-semibold text-neutral-900">
                Rental pricing
              </p>
              <p className="text-sm text-neutral-600 mt-1">
                These are the advertiser-facing rates for this listing. Your
                AdSpot owner billing model is managed separately in Billing &
                Payments.
              </p>
            </Card>
            {formData.category === "screen" ? (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Hourly Rate (₦) *
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.hourlyPrice || ""}
                  onChange={(e) =>
                    updateFormData("hourlyPrice", Number(e.target.value))
                  }
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Set the price per hour for renting this screen.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Daily Rate (₦) *
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 50000"
                    value={formData.dailyPrice || ""}
                    onChange={(e) =>
                      updateFormData("dailyPrice", Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Weekly Rate (₦) - Optional discount
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 300000"
                    value={formData.weeklyPrice || ""}
                    onChange={(e) =>
                      updateFormData("weeklyPrice", Number(e.target.value))
                    }
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    Leave empty to auto-calculate as 7× daily rate
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Monthly Rate (₦) - Optional discount
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 1000000"
                    value={formData.monthlyPrice || ""}
                    onChange={(e) =>
                      updateFormData("monthlyPrice", Number(e.target.value))
                    }
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    Leave empty to auto-calculate as 30× daily rate
                  </p>
                </div>
              </>
            )}
            {(formData.dailyPrice > 0 ||
              (formData.category === "screen" &&
                (formData.hourlyPrice || 0) > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-5 bg-neutral-50">
                  <p className="text-sm font-semibold text-neutral-700 mb-3">
                    Pricing Preview
                  </p>
                  {formData.category === "screen" ? (
                    <div className="space-y-1.5 text-sm text-neutral-600">
                      <p>
                        Hourly:{" "}
                        <span className="font-bold text-neutral-900">
                          ₦{(formData.hourlyPrice || 0).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-sm text-neutral-600">
                      <p>
                        Daily:{" "}
                        <span className="font-bold text-neutral-900">
                          ₦{formData.dailyPrice.toLocaleString()}
                        </span>
                      </p>
                      <p>
                        Weekly:{" "}
                        <span className="font-bold text-neutral-900">
                          ₦
                          {(
                            formData.weeklyPrice || formData.dailyPrice * 7
                          ).toLocaleString()}
                        </span>
                      </p>
                      <p>
                        Monthly:{" "}
                        <span className="font-bold text-neutral-900">
                          ₦
                          {(
                            formData.monthlyPrice || formData.dailyPrice * 30
                          ).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
            <Card className="p-5 border-neutral-200">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="designServiceAvailable"
                  checked={formData.designServiceAvailable}
                  onChange={(e) => {
                    updateFormData("designServiceAvailable", e.target.checked);
                    if (!e.target.checked) {
                      updateFormData("designServicePrice", 0);
                    }
                  }}
                  className="mt-1 h-5 w-5 rounded text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <label
                    htmlFor="designServiceAvailable"
                    className="font-medium text-neutral-900"
                  >
                    Offer design service to advertisers
                  </label>
                  <p className="mt-1 text-sm text-neutral-500">
                    If an advertiser does not have artwork ready, they can ask
                    you to create it for an extra charge.
                  </p>
                </div>
              </div>

              {formData.designServiceAvailable && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Design Service Fee (₦) *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g., 25000"
                    value={formData.designServicePrice || ""}
                    onChange={(e) =>
                      updateFormData(
                        "designServicePrice",
                        Number(e.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    This fee is added once per booking when the advertiser asks
                    you to create the design.
                  </p>
                </div>
              )}
            </Card>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="instantBook"
                checked={formData.instantBook}
                onChange={(e) =>
                  updateFormData("instantBook", e.target.checked)
                }
                className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
              />
              <div>
                <label
                  htmlFor="instantBook"
                  className="font-medium text-neutral-900"
                >
                  Enable Instant Booking
                </label>
                <p className="text-sm text-neutral-500">
                  Advertisers can book immediately without approval
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Minimum Duration (
                  {formData.category === "screen" ? "hours" : "days"})
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.minDuration}
                  onChange={(e) =>
                    updateFormData("minDuration", Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Maximum Duration (
                  {formData.category === "screen" ? "hours" : "days"})
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.maxDuration}
                  onChange={(e) =>
                    updateFormData("maxDuration", Number(e.target.value))
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Advance Notice (
                {formData.category === "screen" ? "hours" : "days"})
              </label>
              <Input
                type="number"
                min="0"
                value={formData.advanceNotice}
                onChange={(e) =>
                  updateFormData("advanceNotice", Number(e.target.value))
                }
              />
              <p className="text-xs text-neutral-500 mt-2">
                How much time in advance must bookings be made?
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                Cancellation Policy
              </label>
              <div className="space-y-3">
                {[
                  {
                    value: "flexible",
                    label: "Flexible",
                    desc: "Full refund up to 24 hours before",
                  },
                  {
                    value: "moderate",
                    label: "Moderate",
                    desc: "Full refund up to 5 days before",
                  },
                  {
                    value: "strict",
                    label: "Strict",
                    desc: "50% refund up to 7 days before",
                  },
                ].map((policy) => (
                  <motion.label
                    key={policy.value}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.cancellationPolicy === policy.value
                        ? "border-primary-600 bg-primary-50 shadow-soft"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancellationPolicy"
                      value={policy.value}
                      checked={formData.cancellationPolicy === policy.value}
                      onChange={() =>
                        updateFormData("cancellationPolicy", policy.value)
                      }
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-neutral-900">
                        {policy.label}
                      </p>
                      <p className="text-sm text-neutral-500">{policy.desc}</p>
                    </div>
                  </motion.label>
                ))}
              </div>
            </div>
          </div>
        );
      case 7:
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <Card className="p-6 md:p-8 border-primary-100 bg-white shadow-soft">
              <h3 className="text-lg font-bold text-neutral-900 mb-6">
                Review Your Listing
              </h3>
              <div className="space-y-5">
                {[
                  {
                    label: "Primary asset",
                    value:
                      formData.category === "screen" ? "Screen" : "Billboard",
                  },
                  { label: "Title", value: formData.title },
                  {
                    label: "Location",
                    value: `${formData.address}, ${formData.city}, ${formData.state}`,
                  },
                  {
                    label: "GPS",
                    value:
                      formData.latitude && formData.longitude
                        ? `${formData.latitude.toFixed(
                            6
                          )}, ${formData.longitude.toFixed(6)}`
                        : "Not set",
                  },
                  {
                    label: "Specifications",
                    value: `${formData.width}×${formData.height} ${
                      formData.unit
                    } ${
                      formData.type ? `• ${formData.type.toUpperCase()}` : ""
                    } ${
                      formData.category === "billboard"
                        ? formData.hasLighting
                          ? "• With Lighting"
                          : "• No Lighting"
                        : ""
                    }`,
                  },
                  {
                    label: "Pricing",
                    value:
                      formData.category === "screen"
                        ? `₦${(formData.hourlyPrice || 0).toLocaleString()}/hr`
                        : `₦${formData.dailyPrice.toLocaleString()}/day`,
                  },
                  {
                    label: "Design Service",
                    value: formData.designServiceAvailable
                      ? `Available for ₦${formData.designServicePrice.toLocaleString()}`
                      : "Not offered",
                  },
                  {
                    label: "Photos",
                    value: `${photos.length} image(s) uploaded`,
                  },
                  {
                    label: "Booking",
                    value: formData.instantBook
                      ? "Instant Book Enabled"
                      : "Requires Approval",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2 border-b border-neutral-100 last:border-0"
                  >
                    <p className="text-sm text-neutral-500 sm:w-32 flex-shrink-0">
                      {item.label}
                    </p>
                    <p className="font-medium text-neutral-900">{item.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Mini map preview in review */}
              {formData.latitude && formData.longitude && (
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-sm text-neutral-500 mb-2">Map Preview</p>
                    <div className="rounded-xl overflow-hidden border border-neutral-200 z-0">
                      <GoogleMapInteractive
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        defaultCenter={defaultCenter}
                        heightClassName="h-[200px]"
                        readOnly={true}
                      />
                    </div>
                  </div>

                  <StreetViewPanel
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    title="Street View Preview"
                    subtitle="Use this to confirm the road-facing context before submitting the listing."
                    heightClassName="h-[260px]"
                  />
                </div>
              )}
            </Card>
            <p className="text-sm text-neutral-500 text-center">
              By submitting, you confirm that all information is accurate and
              you have the right to list this {formData.category}. Admin will
              review the listing before it becomes visible to advertisers.
            </p>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  return (
    <DashboardLayout
      userRole="owner"
      title="Create New Listing"
      subtitle="Add a new billboard or screen to your inventory"
    >
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-10 pb-10">
        {/* Left: Vertical Progress Steps */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 sticky top-24">
            <h3 className="text-sm font-bold text-neutral-900 mb-6 uppercase tracking-wider">
              Creation Steps
            </h3>
            <div className="space-y-6">
              {STEPS.map((step, index) => {
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;

                return (
                  <div
                    key={step.id}
                    className="relative flex items-start gap-4"
                  >
                    {/* Connecting Line */}
                    {index < STEPS.length - 1 && (
                      <div className="absolute left-[13px] top-8 bottom-[-24px] w-0.5 bg-neutral-100">
                        <motion.div
                          initial={{ height: "0%" }}
                          animate={{ height: isCompleted ? "100%" : "0%" }}
                          transition={{ duration: 0.5 }}
                          className="w-full bg-[#d4f34a]"
                        />
                      </div>
                    )}

                    {/* Step Indicator */}
                    <motion.div
                      initial={false}
                      animate={{
                        backgroundColor: isCompleted
                          ? "#d4f34a"
                          : isActive
                          ? "#171717"
                          : "#f5f5f5",
                        borderColor: isActive ? "#171717" : "transparent",
                        scale: isActive ? 1.05 : 1,
                      }}
                      className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                        isCompleted
                          ? "text-neutral-900"
                          : isActive
                          ? "text-white"
                          : "text-neutral-400"
                      }`}
                    >
                      {isCompleted ? (
                        <MdCheck size={14} className="text-green-800" />
                      ) : (
                        <span className="text-[10px] font-bold">{step.id}</span>
                      )}
                    </motion.div>

                    {/* Step Text */}
                    <div className="pt-0.5">
                      <p
                        className={`text-sm font-bold ${
                          isActive
                            ? "text-neutral-900"
                            : isCompleted
                            ? "text-neutral-700"
                            : "text-neutral-400"
                        }`}
                      >
                        {step.name}
                      </p>
                      <p
                        className={`text-[10px] mt-0.5 ${
                          isActive ? "text-neutral-500" : "text-neutral-300"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Step Content Form inside floating card */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-[2rem] shadow-sm border border-neutral-100 p-6 md:p-10 mb-6 min-h-[500px] flex flex-col">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-neutral-900">
                {STEPS[currentStep - 1].name}
              </h2>
              <p className="text-neutral-500 text-sm mt-1">
                {STEPS[currentStep - 1].description}
              </p>
            </div>

            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  variants={stepContentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Footer */}
            <div className="mt-12 pt-6 border-t border-neutral-100">
              <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentStep((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentStep === 1}
                  className="!rounded-xl w-full md:w-auto md:px-6"
                >
                  <MdArrowBack className="mr-2" /> Back
                </Button>

                <Button
                  variant="ghost"
                  onClick={startOver}
                  className="!rounded-xl w-full md:w-auto"
                >
                  Start Over
                </Button>
                <Button
                  variant="outline"
                  onClick={saveDraft}
                  className="!rounded-xl w-full md:w-auto"
                >
                  Save Draft
                </Button>

                {currentStep < 7 ? (
                  <Button
                    onClick={() => {
                      setHasUnsavedChanges(true);
                      setCurrentStep((prev) => Math.min(7, prev + 1));
                    }}
                    disabled={!canProceed()}
                    className="!bg-[#d4f34a] !text-green-900 hover:!bg-[#c5e53a] !rounded-xl w-full md:w-auto md:px-8 font-semibold"
                  >
                    Continue <MdArrowForward className="ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={!canProceed() || isSubmitting}
                    className="!bg-neutral-900 !text-white hover:!bg-neutral-800 !rounded-xl col-span-2 md:col-span-1 w-full md:w-auto md:px-8 font-semibold"
                  >
                    Submit Listing <MdCheck className="ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ── Start Over Confirmation Modal ── */}
      <Modal
        isOpen={showStartOverModal}
        onClose={() => setShowStartOverModal(false)}
        closeOnBackdrop={false}
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-7 h-7 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              Start Over?
            </h3>
            <p className="text-sm text-neutral-500">
              This will clear all your progress and cannot be undone. Any
              unsaved changes will be lost.
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={() => setShowStartOverModal(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
            >
              Keep Editing
            </button>
            <button
              onClick={confirmStartOver}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
            >
              Yes, Start Over
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Restore Draft Modal ── */}
      <Modal
        isOpen={showRestoreDraftModal}
        onClose={dismissRestoreDraft}
        closeOnBackdrop={false}
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#d4f34a]/30 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-7 h-7 text-green-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              Unsaved Draft Found
            </h3>
            <p className="text-sm text-neutral-500">
              You have an unfinished listing draft. Would you like to pick up
              where you left off?
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={dismissRestoreDraft}
              className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
            >
              Start Fresh
            </button>
            <button
              onClick={confirmRestoreDraft}
              className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
            >
              Restore Draft
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Unsaved Changes / Leave Page Modal ── */}
      <Modal
        isOpen={blocker.state === "blocked"}
        onClose={() => blocker.state === "blocked" && blocker.reset()}
        closeOnBackdrop={false}
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-7 h-7 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              Leave without saving?
            </h3>
            <p className="text-sm text-neutral-500">
              You have unsaved changes. Save a draft first to continue later, or
              leave and lose your progress.
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={() => blocker.state === "blocked" && blocker.reset()}
              className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
            >
              Keep Editing
            </button>
            <button
              onClick={() => {
                saveDraft();
                if (blocker.state === "blocked") blocker.proceed();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#d4f34a] text-green-900 font-medium hover:bg-[#c5e53a] transition-colors"
            >
              Save & Leave
            </button>
            <button
              onClick={() => blocker.state === "blocked" && blocker.proceed()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default CreateListing;
